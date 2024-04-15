#! /bin/bash
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <json_file>"
    exit 1
fi

JSON_FILE=$1
TEMPLATE_DIR="git/template"
OUTPUT_DIR="temp/$(basename "$JSON_FILE" .json)"

mkdir -p "$OUTPUT_DIR"
cp -r "$TEMPLATE_DIR/"* "$OUTPUT_DIR/"

find "$OUTPUT_DIR" -type f -exec sh -c 'mustache "$1" "$2" > "$2".tmp && mv "$2".tmp "$2"' _ "$JSON_FILE" {} \;
