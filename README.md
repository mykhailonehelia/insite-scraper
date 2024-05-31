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
