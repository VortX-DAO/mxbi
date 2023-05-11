# mxbi - Generate Backend for MX Smart Contract Endpoints

mxbi is a command-line interface (CLI) tool that generates backend code for MX smart contract endpoints. The tool generates TypeScript code that can be used to implement the server-side logic for smart contract endpoints.

## Installation

To install mxbi, run the following command:

```bash
npm install -g @vortx/mxbi
```

This will install the tool globally on your system.

## Usage

To use mxbi, run the following command:

```bash
mxbi generate-backend [options]
```

The following options are available:

- `-n, --name <name>`: The name of your smart contract project. If not provided, the name of the current working directory will be used.
- `-g, --generatedPath <generatedPath>`: The directory where the generated files should be written. If not provided, the current working directory will be used.

For example, to generate endpoint code for a smart contract project called `MyContract`, you would run the following command:

```bash
mxbi generate-backend -n MyContract -g /path/to/project
```

By default, the tool will generate endpoint code in the current working directory with the name of the current working directory.

## Building and Running the Tool

To build and run the tool, use the following commands:

```bash
npm run build && cd lib && npm link && chmod +x /opt/homebrew/bin/mxbi
```

This will build the tool and create a symbolic link to the tool in the `/opt/homebrew/bin` directory, which allows you to run the tool by typing `mxbi` in the command line.

## License

mxbi is released under the MIT License. See the `LICENSE` file for details.
