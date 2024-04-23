#! /bin/bash
SCRIPT_DIR=$(dirname "$(realpath "$0")")
echo "$SCRIPT_DIR"

for dir in "$SCRIPT_DIR"/*; do
  if [ -d "$dir" ]; then
    FOLDER_NAME=$(basename "$dir")
    echo "Starting deployment for function: $FOLDER_NAME"
	envVars=""
	if [ "$dir" = "insite-extract-data" ]; then
		envVars="--set-env-vars SCRAPINGBEE_API_KEY=$SCRAPINGBEE_API_KEY"
	fi
    (cd "$dir" && gcloud functions deploy "$FOLDER_NAME" --gen2 --runtime=nodejs20 --source=. --entry-point=entry --trigger-http --allow-unauthenticated --quiet $envVars) &
  fi
done

wait
echo "All functions have been deployed."
