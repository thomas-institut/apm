class SimpleProfiler {

  constructor ( name, start = true) {
    this.startTime = 0
    this.name = name
    if (start) {
      this.start()
    }
  }

  start() {
    this.startTime = window.performance.now()
    console.log('Profiler ' + this.name + ': started ' + this.startTime)
  }

  lap(lapName) {
    let now = window.performance.now()
    console.log('Profiler ' + this.name + ': lap ' + lapName + ': ' + (now - this.startTime) + ' ms')
  }

  stop() {
    this.lap('STOP')
  }

}