

/**
 * This class encapsulates all calendar calculation and utility functions, including
 * conversions between them. Formulas and algorithms are taken from
 *
 * Dershowitz and Reingold, *Calendrical Calculations*, Cambridge, Cambridge UP, 2018
 *
 * The following calendars are supported:
 *  * __Rata Die (RD)__: the basis for all conversions in this class. Every day is assigned an integer number, with
 *    day 1 (RD 1) defined as January 1, Year 1 in the Gregorian Calendar. RD days start at midnight and all calculations
 *    that return RD numbers from other calendars return the RD number for the day in question at noon. This eliminates
 *    ambiguities with calendars in which the day starts at sunset.
 *
 *  * __Gregorian__: Solar calendar commissioned by Pope Gregory XIII in the 16th century, devised by the Naples astronomer
 *    Aloysius Lilius. The year has normally 365 days divided into 12 months of 28, 30 or 31 days. Every 4 years,
 *    except when the year is divisible by 100 but not divisible by 400, a leap day is added to the second month.
 *    Days start invariably at midnight local time (a custom from Roman times) and all years start on January 1st (also
 *    a Roman custom). It was adopted in Spain, Portugal and parts of Italy on October 15th, 1582, then in France in
 *    December 1582, with  the rest of the countries slowly opting in throughout the next centuries. UK and its colonies
 *    adopted it only in 1752, and Saudi Arabia in 2016.
 *
 *    In line with the IS0 8601 standard, there are negative year numbers as well as a year 0, which corresponds to
 *    the year normally expressed as 1 BCE. This makes the Gregorian calendar mathematically continuous and therefore
 *    a good choice when entering a date with accuracy. There is, of course, no guarantee that dates reported using
 *    Gregorian-like dates are accurate by any means, especially given the different dates of adoption of the standard
 *    and potentially different conceptions as to what constitutes midnight. Furthermore, events that
 *    happened before 1582-10-15 are often reported, even today, using the Julian calendar.
 *
 *  * __Julian__: Solar calendar instituted by Julius Caesar in 45 BCE with the help of Alexandrian astronomer Sosigenes.
 *    The main difference with the Gregorian calendar is that leap days are added every 4 years without exception. The
 *    names of the months are the same and the year starts on January 1st. Again, most dates before Oct. 15, 1582 are
 *    expressed in the Julian calendar, with the year numbers being continuous with the Gregorian calendar.
 *    However, there is no year 0 and so the day before January 1st of year 1, is December 31 of year -1. Negative years
 *    are commonly expressed with the suffix BCE.  Note that January 1, 1 in the Gregorian calendar does not correspond
 *    to January 1, 1 in the Julian calendar, but to January 3, 1.
 *
 *    Year 1 is supposed to be the year of the conception or birth of Jesus (anno Domini, AD), but the term Before
 *    the Common Era (BCE) is used as a more neutral designation. The AD system was devised in the 6th century
 *    but was not widespread until the 8th. Before that, Roman custom was used, in which the year number
 *    was commonly restarted every time a new consul or a new emperor came into power. In Christian lands, papal reigns
 *    defined the year numbers.
 *
 *    There is also a period of inconsistent application of the leap year rule in Rome between 45 BCE and Augustus
 *    reformation in 8 BCE. In general, any date expressed in Roman documents before 8 BCE is
 *    dubious and can only be estimated with some degree of accuracy by relating it to some astronomical event.
 *
 *  * __Islamic (Observational)__: the traditional Islamic calendar, a strictly lunar calendar with the year divided into
 *    12 months. Days start at sunset. Months start on the birth of the new lunar cycle, which is determined by actual
 *    observation of the moon crescent. Depending on the geographical position of the observer, the local weather and
 *    the observer's skills and instruments, the start of the month may be off by one or two days with respect to
 *    the precise astronomical start of the moon cycle. This is still the custom in many Muslim countries and theological
 *    reasons may be given as to why it must not be changed to using precise astronomical formulas. This class
 *    provides a method to estimate the RD from a traditional Islamic date. The actual date might be off by one or two
 *    days, but it could be even more in extreme cases.
 *
 *   * __Islamic (Tabular)__ Early Muslim astronomers, however, devised the so-called Tabular calendar where the
 *    length of the months are calculated by arithmetical rules. This is used in many countries and by historians.
 *    In this calendar, each year has 12 months. Odd numbered months have 30 days and even numbered months have 29.
 *    On 11 specific years in a 30-year cycle, a leap day is added to the 12th month, making it 30 days long instead
 *    of 29. Different versions differ only in the designation of these 11 leap years and on the date of day 1
 *    (Muharram 1, AH 1)  This class supports three versions:
 *      * Standard: leap years 2, 5, 7, 10, 13, 16, 18, 21, 24, 26, and 29
 *      * Ulugh Beg: same as standard, but year 15 is a leap year instead of year 16
 *      * Bohras: leap years 2, 5, 8, 10, 13, 16, 19, 21, 24, 27, and 29;
 *
 *    A date reported in the traditional Islamic calendar is normally off by no more than ±1 day with respect to the
 *    tabular date, ±2 days in extreme cases.
 *
 *    Since the day in Islamic calendars begins at sunset, not at midnight, an Islamic date may refer to one of two
 *    consecutive dates in the RD, Gregorian and Julian calendars if no time of day is given. As said above, the
 *    calculations in this class  assume that the date is the date at noon, which eliminates this ambiguity.
 *    However, the ambiguity still exists for precise dating of an event if the event in question may have occurred
 *    at nighttime.
 *
 *  * __Hebrew (Observational)__:
 *
 */
export class Calendar {

  /**
   * Returns the RD day corresponding to a Gregorian date
   * @param {number} gregorianYear
   * @param {number}gregorianMonth  1-12
   * @param {number}gregorianDay 1-31
   * @constructor
   */
  static RD_fromGregorian(gregorianYear, gregorianMonth, gregorianDay) {

    let daysToEndOfPreviousYear = 365 * (gregorianYear-1);
    let leapDays = Math.floor((gregorianYear-1)/4) - Math.floor((gregorianYear-1)/100) + Math.floor( (gregorianYear-1)/400);
    let correction;
    if (gregorianMonth <= 2) {
      correction = 0;
    } else if (this.__isGregorianLeapYear(gregorianYear)) {
      correction = -1;
    } else {
      correction = -2;
    }
    let daysFromNewYearToEndOfPreviousMonth =  Math.floor( ( (367 * gregorianMonth) - 362)/12) + correction;
    // console.log(`Intermediate results`, [ year, month, day, daysToEndOfPreviousYear, leapDays, daysFromNewYearToEndOfPreviousMonth]);

    return EpochGregorian - 1 + daysToEndOfPreviousYear + leapDays + daysFromNewYearToEndOfPreviousMonth + gregorianDay;
  }

  /**
   * Returns the rd for a given Date object
   * @param {Date} dateObject
   */
  static RD_fromJsDate(dateObject) {
    return this.RD_fromGregorian(dateObject.getFullYear(), dateObject.getMonth() +1, dateObject.getDay()+1);
  }

  static RD_fromUnixTimestamp(timestamp) {
    if (typeof timestamp === 'number') {
      timestamp = Math.floor(timestamp);
    } else {
      timestamp = parseInt(timestamp);
    }
    return this.RD_fromJsDate(new Date(timestamp));
  }

  static dayOfTheWeek_fromRD(rd) {
    return rd % 7;
  }

  /**
   *
   * @param gregorianYear
   * @return {boolean}
   * @private
   */
  static __isGregorianLeapYear(gregorianYear) {
    return (gregorianYear % 4 === 0) && (gregorianYear % 400 !== 0);
  }

  /**
   * Returns a [ year, month, day] triple with
   * the Julian calendar date corresponding to the given RD day
   * @param rd
   */
  static Julian_fromRD(rd) {
    let approx = Math.floor( (1/1461) * (4 * (rd - EpochJulian) + 1464));
    let julianYear = approx <=0 ? approx -1: approx;
    let priorDays = rd - this.RD_fromJulian(julianYear, 1, 1);
    let correction;
    if ( rd < this.RD_fromJulian(julianYear, 3, 1)) {
      correction = 0;
    } else if (this.__isJulianLeapYear(julianYear)) {
      correction = 1;
    } else {
      correction = 2;
    }
    let julianMonth = Math.floor( (1/367) * (12 * (priorDays + correction ) + 373));
    let julianDay = rd - this.RD_fromJulian(julianYear, julianMonth, 1) + 1;
    return [ julianYear, julianMonth, julianDay];
  }

  Gregorian_monthName(monthNumber, abbreviation = false) {
    const monthNames = [ '',
        'January', 'February', 'March',
        'April', 'May', 'June',
        'July', 'August', 'September',
        'October', 'November', 'December'
    ];

    const monthNamesAbbreviations = [ '',
      'Jan', 'Feb', 'Mar',
      'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep',
      'Oct', 'Nov', 'Dec'
    ];

    let names = abbreviation ? monthNamesAbbreviations : monthNames;

    return names[monthNumber] ?? 'InvalidMonth';
  }

  Islamic_monthName(monthNumber) {
    const monthNames = [ '',
      'Muḥarram', 'Ṣafar', "Rabīʿ al-ʾAwwal",
      "Rabīʿ al-Thānī,", "Jumādā al-ʾAwwal", "Jumādā al-Thānī",
      "Rajab", "Šaʿbān", "Ramaḍān",
      "Šawwāl)", "Ḏū al-Qaʿdah", "Ḏū al-Ḥijja"
    ];

    return monthNames[monthNumber] ?? '';
  }

  Julian_monthName(monthNumber, abbreviation = false) {
    return this.Gregorian_monthName(monthNumber, abbreviation);
  }

  static RD_fromJulian(julianYear, julianMonth, julianDay) {
    let adjustedYear = julianYear < 0 ? julianYear +1 : julianYear;
    let daysToEndOfPreviousYear = 365 * (adjustedYear-1);
    let leapDays = Math.floor((adjustedYear-1)/4);
    let correction;
    if (julianMonth <= 2) {
      correction = 0;
    } else if (this.__isJulianLeapYear(julianYear)) {
      correction = -1;
    } else {
      correction = -2;
    }
    let daysFromNewYearToEndOfPreviousMonth =  Math.floor( ( (367 * julianMonth) - 362)/12) + correction;
    // console.log(`Intermediate results`, [ year, month, day, daysToEndOfPreviousYear, leapDays, daysFromNewYearToEndOfPreviousMonth]);

    return EpochJulian - 1 + daysToEndOfPreviousYear + leapDays + daysFromNewYearToEndOfPreviousMonth + julianDay;
  }

  /**
   *
   * @param julianYear
   * @return {boolean}
   * @private
   */
  static __isJulianLeapYear(julianYear) {
    let mod = julianYear % 4;
    return (julianYear > 0 && mod === 0) || (julianYear <=0 && mod ===3);
  }

}


const EpochGregorian = 1;  // 1 Jan 1
const EpochJulian = -1;
const EpochIslamic = 227015;  // 16 July 622 CE (Julian)
const EpochIslamicBohras = 227014 // 15 July 622 CE (Julian)
const EpochHebrew = -1373427 // 7 October 3761 BCE (Julian) = -3760-09-07