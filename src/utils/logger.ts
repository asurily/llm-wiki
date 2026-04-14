import chalk from 'chalk';
import ora, { Ora } from 'ora';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

class Logger {
  private verbose: boolean = false;
  private spinner: Ora | null = null;

  setVerbose(verbose: boolean): void {
    this.verbose = verbose;
  }

  debug(message: string): void {
    if (this.verbose) {
      console.log(chalk.gray(`[debug] ${message}`));
    }
  }

  info(message: string): void {
    console.log(chalk.blue('ℹ'), message);
  }

  success(message: string): void {
    console.log(chalk.green('✓'), message);
  }

  warn(message: string): void {
    console.log(chalk.yellow('⚠'), message);
  }

  error(message: string): void {
    console.log(chalk.red('✗'), message);
  }

  startSpinner(message: string): void {
    this.spinner = ora(message).start();
  }

  updateSpinner(message: string): void {
    if (this.spinner) {
      this.spinner.text = message;
    }
  }

  stopSpinner(success: boolean = true, message?: string): void {
    if (this.spinner) {
      if (success) {
        this.spinner.succeed(message);
      } else {
        this.spinner.fail(message);
      }
      this.spinner = null;
    }
  }
}

export const logger = new Logger();
