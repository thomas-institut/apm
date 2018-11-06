/*
 * Copyright (C) 2016-18 Universität zu Köln
 *
 * This program is free software; you can redistribute it and/or
 * modify it under the terms of the GNU General Public License
 * as published by the Free Software Foundation; either version 2
 * of the License, or (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program; if not, write to the Free Software
 * Foundation, Inc., 59 Temple Place - Suite 330, Boston, MA  02111-1307, USA.
 */

class SimpleIstanbulReporter {
  
  generateReport(c) {
    let html ='<div class="sir"><h2>Coverage</h2>'
    html += '<table><tr><th>File</th><th>Branches</th><th>Conditions</th><th>Functions</th><th>Statements</th></tr>'
    let totalBranchCount = 0
    let totalFunctionCount = 0
    let totalConditionCount = 0
    let totalStatementCount = 0
    
    let totalCoveredBranchCount = 0
    let totalCoveredConditionCount = 0
    let totalCoveredFunctionCount = 0
    let totalCoveredStatementCount = 0
    
    for (const file in c) {
        let info = c[file]
        let branchCount = Object.keys(info.b).length
        let functionCount = Object.keys(info.f).length
        let statementCount = Object.keys(info.s).length

        let coveredBranches = 0
        let conditionCount = 0
        let coveredConditions = 0

        for(const b in info.b) {
            let branchIsCovered = true
            for(const condition of info.b[b]) {
                conditionCount++
                if (condition > 0) {
                    coveredConditions++
                } else {
                    branchIsCovered = false
                }
            }
            if (branchIsCovered) {
                coveredBranches++
            }
        }
        let coveredFunctions = 0
        for (const fnumber in info.f) {
            if (info.f[fnumber]  > 0) {
                coveredFunctions++
            }
        }

        let coveredStatements = 0
        for (const snumber in info.s) {
            if (info.s[snumber]  > 0) {
                coveredStatements++
            }
        }

        html += '<tr><td>' + info.path + '</td>'
        html += this.generateTd(coveredBranches, branchCount)
        html += this.generateTd(coveredConditions, conditionCount)
        html += this.generateTd(coveredFunctions, functionCount)
        html += this.generateTd(coveredStatements, statementCount)
        html += '</tr>'
        
        totalBranchCount += branchCount
        totalCoveredBranchCount += coveredBranches
        totalConditionCount += conditionCount
        totalCoveredConditionCount += coveredConditions
        totalFunctionCount += functionCount
        totalCoveredFunctionCount += coveredFunctions
        totalStatementCount += statementCount
        totalCoveredStatementCount += coveredStatements
        
    }
    html += '<tr class="totals"><td>TOTAL</td>'
    html += this.generateTd(totalCoveredBranchCount, totalBranchCount)
    html += this.generateTd(totalCoveredConditionCount, totalConditionCount)
    html += this.generateTd(totalCoveredFunctionCount, totalFunctionCount)
    html += this.generateTd(totalCoveredStatementCount, totalStatementCount)
    html += '</tr>'
    html += '</table></div>'
    return html
  }
  
  generateTd(n, total) {
    if (total === 0) {
      return '<td>0 / 0 (--)'
    }
    
    let percentage = n*100.0/total;
    let tdClass="good"
    if (percentage < 50) {
      tdClass = 'low'
    } else {
      if (percentage < 90) {
        tdClass = 'medium'
      }
    }
    
    if (n === total) {
      tdClass= 'perfect'
    }
    return '<td class="' + tdClass + '">' + n + ' / ' + total + ' (' + percentage.toFixed(2) + '%)</td>'
  }
}
