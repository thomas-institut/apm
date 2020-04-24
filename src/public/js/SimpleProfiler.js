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
    this.lastLap = this.startTime
    //console.log('Profiler ' + this.name + ': started ' + this.startTime)
  }

  lap(lapName) {
    let now = window.performance.now()
    console.log(`${this.name} : ${lapName} in ${now - this.lastLap} ms (at ${now - this.startTime} ms)`)
    this.lastLap = now
  }

  stop(lastLapName = 'last lap') {
    let now = window.performance.now()
    if (this.lastLap !== this.startTime) {
      // there were laps
      console.log(`${this.name} : finished in ${now - this.startTime} ms (${lastLapName} in ${now - this.lastLap} ms)`)
    } else {
      console.log(`${this.name} : finished in ${now - this.startTime} ms`)
    }
  }

}