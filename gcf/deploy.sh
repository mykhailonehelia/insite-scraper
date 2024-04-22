#! /bin/bash

for dir in gcs/*; do
  if [ -d "$dir" ]; then
    FOLDER_NAME=$(basename "$dir")
    (cd "$dir" && gcloud functions deploy "$FOLDER_NAME" --gen2 --runtime=nodejs20 --source=. --entry-point=entry --trigger-http)
  fi
done
