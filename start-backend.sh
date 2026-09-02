#!/bin/bash
cd ~/Projects/speakup-english/speakup-backend
export $(cat .env | xargs)
mvn spring-boot:run
