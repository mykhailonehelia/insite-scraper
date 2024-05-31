# insite-scraper

## Getting Started

Follow these steps to get the project up and running:

### Prerequisites

- Ensure you have Docker and Docker Compose installed on your machine.

### Installation

1. **Clone the repository:**
   ```sh
   git clone <repository-url>
   cd insite-scraper
   ```

2. **Build the Docker containers:**
   ```sh
   docker compose build
   ```

3. **Copy the example environment file and configure it:**
   ```sh
   cp .env.example .env
   ```

4. **Add your API keys to the `.env` file.**

5. **Start the Docker containers:**
   ```sh
   docker compose up -d
   ```

The application will now be listening at port `3000`.

### Example Usage

You can use the following `curl` command to interact with the application:

```sh
curl -X POST -H "Content-Type: application/json" -d '{ "sites": [ { "url": "https://magicserviceco.com/", "companyName": "Magic Service Co" } ], "callback": "https://n8n.kianmusser.com/webhook-test/0c50a78d-67b1-4c70-b584-657d157a0999" }' http://localhost:3000/process
```

This command takes a list of site URLs and names, and a callback URL. The application will send POST requests to the callback URL as each site is processed.
