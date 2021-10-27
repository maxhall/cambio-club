// NB: This logic tested and moved to utils.
// Based on: https://stackoverflow.com/questions/3144711/find-the-time-left-in-a-settimeout/36389263#36389263
class Timer {
  /**
   * @param {() => void} callback
   * @param {number} delay Time in milliseconds
   * 
   * This probably wouldn't respond well to `start()` being called several times 
   * nor does it prevent being restrated once it's finished
   */
  constructor(callback, delay) {
    this.callback = callback;
    this.remaining = delay;
    /** @type {number} */
    this.startedTime;
    /** @type {NodeJS.Timeout} */
    this.timeout;
    this.running = false;

    this.start();
  }

  start() {
    this.running = true;
    this.startedTime = new Date().valueOf();
    this.timeout = setTimeout(this.callback, this.remaining);
  }

  pause() {
    this.running = false;
    clearTimeout(this.timeout);
    const timeElapsedSinceLastStart = new Date().valueOf() - this.startedTime;
    this.remaining = this.remaining - timeElapsedSinceLastStart;
  }

  remove() {
    clearTimeout(this.timeout);
  }

  getRemainingTime() {
    if (this.running) {
      this.pause();
      this.start();
    }

    return this.remaining;
  }

  isRunning() {
    return this.running;
  }
}

// const start = new Date().valueOf();

// const timer = new Timer(() => {
//     console.log('Timer finished!');
//     console.log(`Total time: ${new Date().valueOf() - start}`);
// }, 5000);

// setTimeout(() => {
//     console.log(`1.5 seconds elapsed, time remaining is ${timer.getRemainingTime()}`);
//     console.log(`Pausing.`);
//     timer.pause();
// }, 1500)

// setTimeout(() => {
//     console.log(`Restarting after 2 seconds`);
//     timer.start();
//     console.log(`Time remaining: ${timer.getRemainingTime()}`);
// }, 3500)

// Need to test whether setting the timer reference to undefined prevents the callback being fired

let timer = new Timer(() => {
  console.log('Callback fired');
}, 1000);

timer.remove();