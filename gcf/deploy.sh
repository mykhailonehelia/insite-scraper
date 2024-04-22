#! /bin/bash
SCRIPT_DIR=$(dirname "$(realpath "$0")")

for dir in "$SCRIPT_DIR"/gcs/*; do
  if [ -d "$dir" ]; then
    FOLDER_NAME=$(basename "$dir")
    echo "Deploying function: $FOLDER_NAME"
    (cd "$dir" && gcloud functions deploy "$FOLDER_NAME" --gen2 --runtime=nodejs20 --source=. --entry-point=entry --trigger-http)
  fi
done
