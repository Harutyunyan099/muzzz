#!/usr/bin/env bash
cd "$(dirname "$0")" || exit 1
echo "Գործարկվում է Երգարանը..."
if command -v python3 >/dev/null 2>&1; then
  python3 server.py
elif command -v python >/dev/null 2>&1; then
  python server.py
else
  echo "Python-ը չի գտնվել։ Տեղադրիր այն՝ https://www.python.org/downloads/"
  read -r -p "Սեղմիր Enter՝ փակելու համար"
fi
