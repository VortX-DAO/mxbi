## mxbi - Generate Backend for MX Smart Contract Endpoints

mxbi is a command-line interface (CLI) tool that generates backend code for MX smart contract endpoints. The tool generates TypeScript code that can be used to implement the server-side logic for smart contract endpoints.

### Installation

To install mxbi, run the following command:

```bash
npm install -g @vortx/mxbi
```

This will install the tool globally on your system.

### Usage

To use mxbi, run the following command:

```bash
mxbi generate-backend --contractPath <contractPath> [--skip-build]
```

The following options are available:

- `-c, --contractPath <contractPath>`: The path to your directory containing the smart contracts. This is a required option.

- `-s, --skip-build`: If included, mxbi will skip the build process. This option is optional and defaults to `false` if not provided.

For example, to generate endpoint code for a directory of smart contracts located at `./contracts/`, you would run the following command:

```bash
mxbi generate-backend --contractPath ./contracts/
```

### Building and Running the Tool

To build and run the tool, use the following commands:

```bash
npm run build && cd lib && npm link && chmod +x /opt/homebrew/bin/mxbi
```

This will build the tool, create a symbolic link to the tool in the `/opt/homebrew/bin` directory, and set executable permissions, which allows you to run the tool by typing `mxbi` in the command line.

### Issues

If you encounter any issues while using mxbi, please file an issue in the GitHub repository.

### Contributing

Contributions to mxbi are always welcome. If you're interested in contributing, please fork the repository and submit a pull request. For major changes, please open an issue first to discuss what you would like to change.

### License

mxbi is released under the MIT License. See the `LICENSE` file for details.
