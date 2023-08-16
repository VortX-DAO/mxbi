import { spawn } from 'child_process';

export const buildContract = (inputPath: string): Promise<void> => {
  console.log('Compiling Contracts ....');
  return new Promise((resolve, _reject) => {
    const child = spawn('sh', [
      '-c',
      `
      SMART_CONTRACT_JSONS=$(find ${inputPath} -name "multiversx.json")
      for smart_contract_json in $SMART_CONTRACT_JSONS
      do
        smart_contract_folder=$(dirname $smart_contract_json)
        echo ""
        (set -x; mxpy contract build $smart_contract_folder)
      done
    `,
    ]);

    child.stdout.on('data', (data) => {
      console.log(`stdout:\n${data}`);
    });

    child.stderr.on('data', (data) => {
      console.error(`stderr:\n${data}`);
    });

    child.on('error', (error) => {
      console.error(`error:\n${error.message}`);
    });

    child.on('close', (code) => {
      console.log(`Contracts built - code: ${code}`);
      resolve();
    });
  });
};
