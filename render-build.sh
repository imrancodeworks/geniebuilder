#!/usr/bin/env bash
# exit on error
set -o errexit

echo "--- Upgrading pip ---"
python -m pip install --upgrade pip

echo "--- Installing Python dependencies ---"
pip install -r requirements.txt


echo "--- Downloading spaCy model ---"
python -m spacy download en_core_web_sm

echo "--- Building Frontend ---"
cd PrepAI-v4
npm install
npm run build

echo "--- Build complete! ---"
