import { ObjectValidator } from './ObjectValidator'
import { isNumeric, trimWhiteSpace } from '../toolbox/Util.mjs'

export class VagueDateValidator extends ObjectValidator {

  validateObject (object) {
    let value = trimWhiteSpace(object.toString().replace(/\s+/g, ' '));
    let dateStrings = value.split(' ');
    if (dateStrings.length > 2) {
      return [ `More than two dates given`];
    }

    let issues = [];

    let dates = dateStrings.map( (dateString) => {
      return this.getDateNumericRepresentation(dateString);
    });

    dates.forEach( (date, index) => {
      if (isNaN(date)) {
        issues.push(`'${dateStrings[index]}' is not a valid date`)
      }
    });
    if (issues.length !== 0) {
      return issues;
    }

    if (dates.length === 2) {
      if (dates[1] < dates[0]) {
        issues.push(`Ante date (${dateStrings[1]}) is before post date (${dateStrings[0]})`);
      }
    }
    return issues;
  }

  getHelp () {
    return `One or two dates in the chosen calendar, each one as [-]YYYY-MM-DD. The month and the day of the month are optional. 
          E.g.,'-200 -100' = an indeterminate date between 200 and 100 BCE, '1980-12' = an 
          indeterminate date in December 1980, '1550-04 1550-05' = an indeterminate date between April 1st and May
          31st 1550, '1925-04-09' = the exact date April 9th, 1925'`
  }

  /**
   * Returns a date's numeric representation from a string
   *
   * A date's numeric representation is a signed integer with YYYYMMDD as its digits.
   * E.g. the string '1980-12-20'  is represented by 19801220
   *
   * We need something like this because vague dates can be BCE dates and Javascript Date mechanism is unreliable
   * in those situations.
   *
   * @param dateString
   * @return {number}
   */
  getDateNumericRepresentation(dateString) {

    let multiplier = 1;
    let fields = dateString.split('-');
    if (fields[0] === '') {
      multiplier = -1;
    } else {
      fields.unshift('');
    }

    if (fields < 2 || fields > 4) {
      return NaN;
    }

    for (let i = 1; i < fields.length; i++) {
      if (!isNumeric(fields[i] ?? '0')) {
        return NaN;
      }
    }

    let year = parseInt(fields[1]);
    let month = parseInt(fields[2] ?? '0');
    let day = parseInt(fields[3] ?? '0');
    if (month > 12) {
      return NaN;
    }
    if (day > 31) {
      return NaN;
    }

    // TODO: use calendar information to check for days in the month
    // if ([4, 6, 9, 11].includes(month) && day > 30) {
    //   return NaN;
    // }



    // if (month === 2) {
    //   let maxDaysInFebruary = 28;
    //   if (multiplier === 1) {
    //     // only CE years included
    //     if (year % 4 === 0) {
    //       // potential leap year
    //       maxDaysInFebruary = 29;
    //     }
    //     if (year > 1582 && (year % 100 === 0) && (year % 400 !== 0)) {
    //       // no leap year if year divisible by 100 in Gregorian calendar, except
    //       // those divisible by 400
    //       maxDaysInFebruary = 28;
    //     }
    //   }
    //   console.log(`Max Days in february for year ${year}: ${maxDaysInFebruary}`);
    //   if (day > maxDaysInFebruary) {
    //     return NaN;
    //   }
    // }
    return multiplier * ( day + month *100 + year * 10000);

  }


}