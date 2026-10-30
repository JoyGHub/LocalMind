# LocalMind

LocalMind is a local web application built with StencilJS that allows users to interact offline with large language models (LLMs) via a simple and intuitive UI. Users can install and manage LLMs directly from the application using [Ollama](https://ollama.com/), a tool for running local language models.

## Features

- Simple and responsive UI to interact with local LLMs.
- Easy installation of models via the app interface.
- Built with StencilJS for fast and lightweight performance.
- Select Off, Low, Medium, or High thinking on models that support Ollama thinking controls.

## Getting Started

### Prerequisites

You'll need Node.js (which includes npm), Python 3.10+, and [Ollama](https://ollama.com/) installed. Keep Ollama running while using LocalMind.

### Installation Steps

Clone the repository, install the project dependencies, and start the app:

```sh
git clone -b main https://github.com/JoyGHub/LocalMind.git
cd LocalMind
npm install
python -m pip install -r backend/requirements.txt
npm run dev
```

The UI and both backends start together. Open the URL printed by Stencil in the terminal.

### Setting Up Large Language Models (LLMs)

Once the app is running, follow these steps to set up and use an LLM:

1. **Install Ollama**
   - Download and install Ollama from their official website: [ollama.com](https://ollama.com/).
   - Follow the installation instructions for your operating system.

2. **Download a Model via UI**
   - Open LocalMind in your browser.
   - Enter the name of the LLM you want to install (e.g., `llama3.3`, `llama3.2`, `gemma:7b`, `deepseek-r1:7b`) into the input field.
   - Click the "Install Model" button.
   - The app will download and install the model for you.

3. **Download a Model via Terminal**

   You can also pull, remove, and run models via the terminal (Command Prompt / Windows PowerShell) by using the following commands:
   - **Show all available commands:**
     ```sh
     ollama help
     ```
   - **Pull a model:**
     ```sh
     ollama pull llama3.2
     ```
   - **Remove a model:**
     ```sh
     ollama rm llama3.2
     ```
   - **Run a model:**
     ```sh
     ollama run llama3.2
     ```

### Example Model Names

Some popular model names you can try installing:

- `llama3.3`
- `llama3.2`
- `gemma:7b`
- `mistral`
- `deepseek-r1:7b`

### Verifying Installation

Once the model is installed successfully, you can select it via the app interface.

## Troubleshooting

If you encounter any issues:

- Ensure Ollama is properly installed and running.
- Check your internet connection when downloading models.
- Review the browser console for any errors related to the app.

## License

This project is licensed under the Apache-2.0 License.
