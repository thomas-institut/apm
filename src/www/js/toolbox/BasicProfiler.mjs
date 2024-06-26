export class BasicProfiler {

  constructor ( name, start = true) {
    this.startTime = 0
    this.name = name
    // only works in the browser for now!
    this.enabled = (typeof window !== undefined)
    if (start) {
      this.start()
    }
  }

  start() {
    if (!this.enabled) {
      return
    }
    this.startTime = window.performance.now()
    this.lastLap = this.startTime
    //console.log('Profiler ' + this.name + ': started ' + this.startTime)
  }

  lap(lapName) {
    if (!this.enabled) {
      return
    }
    let now = window.performance.now()
    console.log(`${this.name} : ${lapName} in ${now - this.lastLap} ms (at ${now - this.startTime} ms)`)
    this.lastLap = now
  }

  stop(lastLapName = 'last lap') {
    if (!this.enabled) {
      return
    }
    let now = window.performance.now()
    if (this.lastLap !== this.startTime) {
      // there were laps
      console.log(`${this.name} : finished in ${now - this.startTime} ms (${lastLapName} in ${now - this.lastLap} ms)`)
    } else {
      console.log(`${this.name} : finished in ${now - this.startTime} ms`)
    }
  }

}