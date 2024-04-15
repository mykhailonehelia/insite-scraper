#! /bin/bash
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <json_file>"
    exit 1
fi

JSON_FILE=$1
TEMPLATE_DIR="template"
OUTPUT_DIR="temp/$(basename "$JSON_FILE" .json)"

mkdir -p "$OUTPUT_DIR"
cp -r "$TEMPLATE_DIR/"* "$OUTPUT_DIR/"

find "$OUTPUT_DIR" \( -name "*.html" -o -name "*.css" -o -name "*.js" \) | while read -r file; do
    echo "processing $file"
    mustache "$JSON_FILE" "$file" > "$file".tmp && mv "$file".tmp "$file"
done
