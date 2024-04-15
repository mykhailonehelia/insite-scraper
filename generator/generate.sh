#! /bin/bash
if [ "$#" -ne 1 ]; then
    echo "Usage: $0 <json_file>"
    exit 1
fi

JSON_FILE=$1
TEMPLATE_DIR="template"
OUTPUT_DIR="build/$(basename "$JSON_FILE" .json)"

rm -rf "$OUTPUT_DIR"
mkdir -p "$OUTPUT_DIR"
cp -r "$TEMPLATE_DIR/dynamic/"* "$OUTPUT_DIR/"

find "$OUTPUT_DIR" -type f | while read -r file; do
    echo "processing $file"
    mustache "$JSON_FILE" "$file" > "$file".tmp && mv "$file".tmp "$file"
done
