const simpleGit = require('simple-git');

export async function downloadRepository(
  gitUrl: string,
  branchName: string,
  folderPath: string,
): Promise<void> {
  try {
    const git = simpleGit();
    await git.clone(gitUrl, folderPath, ['-b', branchName]);
    console.log('Folder created successfully!');
  } catch (error: any) {
    console.error(`Error cloning ${gitUrl}: ${error.message}`);
  }
}
