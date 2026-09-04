package com.speakup.backend.services;

import com.speakup.backend.common.ConversationException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.reactive.function.client.WebClient;
import org.springframework.web.reactive.function.client.WebClientResponseException;

import java.time.Duration;
import java.util.LinkedHashMap;
import java.util.Map;

/**
 * Synthesises the tutor's line with ElevenLabs, for learners who prefer a more natural voice
 * than the browser's built-in synthesiser.
 *
 * <p>The API key never reaches the browser: audio is fetched here and streamed back through
 * {@code /api/tts/speak}. That also means one key serves every learner, which is exactly why the
 * free tier's character allowance runs out — so every failure path here is a soft one. The
 * frontend treats a 503 as "use browser speech", not as an error worth showing.
 *
 * <p>Not configured is not a failure: with a blank {@code ELEVENLABS_API_KEY} the application
 * starts normally and {@link #isConfigured()} simply returns false.
 */
@Service
public class ElevenLabsTtsService {

    private static final Logger log = LoggerFactory.getLogger(ElevenLabsTtsService.class);

    private static final String BASE_URL = "https://api.elevenlabs.io";
    /** MP3 at 22 kHz / 32 kbps: speech-clear, and a fraction of the bytes of the default. */
    private static final String OUTPUT_FORMAT = "mp3_22050_32";
    /** A spoken reply is short; anything slower than this and browser speech is the better answer. */
    private static final Duration TIMEOUT = Duration.ofSeconds(20);
    /** Matches TutorChatService.MAX_REPLY_CHARS — nothing longer is ever spoken. */
    private static final int MAX_TEXT_CHARS = 600;
    /** Ceiling on one clip, so a runaway response cannot be buffered without bound. */
    private static final int MAX_AUDIO_BYTES = 4 * 1024 * 1024;

    private final String apiKey;
    private final String voiceId;
    private final String modelId;
    private final WebClient webClient;

    public ElevenLabsTtsService(
            @Value("${app.elevenlabs-api-key:}") String apiKey,
            @Value("${app.elevenlabs.voice-id:}") String voiceId,
            @Value("${app.elevenlabs.model-id:}") String modelId,
            WebClient.Builder webClientBuilder) {

        this.apiKey = apiKey != null ? apiKey.trim() : "";
        this.voiceId = voiceId;
        this.modelId = modelId;
        this.webClient = webClientBuilder
                .baseUrl(BASE_URL)
                // The response is audio, and the buffer has to hold the whole clip.
                .codecs(codecs -> codecs.defaultCodecs().maxInMemorySize(MAX_AUDIO_BYTES))
                .build();

        if (this.apiKey.isEmpty()) {
            log.info("ElevenLabs is not configured — the tutor will use browser speech only");
        }
    }

    /** False when no API key is set, in which case {@link #speak} must not be called. */
    public boolean isConfigured() {
        return !apiKey.isEmpty();
    }

    /**
     * Renders {@code text} to MP3.
     *
     * @throws ConversationException 502 when ElevenLabs is unconfigured, out of quota, or
     *                               unreachable. The controller turns that into a 503 the
     *                               browser reads as "fall back to browser speech".
     */
    public byte[] speak(String text) {
        if (!isConfigured()) {
            throw ConversationException.aiUnavailable(null);
        }

        String clipped = text.length() > MAX_TEXT_CHARS ? text.substring(0, MAX_TEXT_CHARS) : text;

        // LinkedHashMap rather than Map.of: the request body reads better in a log with the
        // fields in the order the API documents them.
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("text", clipped);
        body.put("model_id", modelId);
        Map<String, Object> settings = new LinkedHashMap<>();
        settings.put("stability", 0.5);
        settings.put("similarity_boost", 0.75);
        body.put("voice_settings", settings);

        try {
            byte[] audio = webClient.post()
                    .uri(uriBuilder -> uriBuilder
                            .path("/v1/text-to-speech/{voiceId}")
                            .queryParam("output_format", OUTPUT_FORMAT)
                            .build(voiceId))
                    .header("xi-api-key", apiKey)
                    .header(HttpHeaders.ACCEPT, "audio/mpeg")
                    .contentType(MediaType.APPLICATION_JSON)
                    .bodyValue(body)
                    .retrieve()
                    .bodyToMono(byte[].class)
                    .block(TIMEOUT);

            if (audio == null || audio.length == 0) {
                log.warn("ElevenLabs returned no audio for a {}-character line", clipped.length());
                throw ConversationException.aiUnavailable(null);
            }
            return audio;
        } catch (WebClientResponseException ex) {
            // 401 revoked key, 422 bad voice id, 429 quota exhausted — all mean the same thing
            // to the learner, so they are logged distinctly and answered identically.
            log.warn("ElevenLabs refused the request: {} {}", ex.getStatusCode(), ex.getMessage());
            throw ConversationException.aiUnavailable(ex);
        } catch (ConversationException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("ElevenLabs call failed: {}", ex.getMessage());
            throw ConversationException.aiUnavailable(ex);
        }
    }
}
