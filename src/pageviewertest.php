<!DOCTYPE html>
<html>
    <head>
        <title>Page Rendering Test</title>
        <link rel="stylesheet" type="text/css" media="screen" href="css/normalize.css" />
        <link rel="stylesheet" type="text/css" media="screen" href="css/styles.css" />
        <script type="application/javascript" src="js/openseadragon.min.js"></script>
        <style type="text/css">
           
            button {
                cursor: pointer;
            }
           
            #viewerheader {
                position: absolute;
                top: 0;
                height: 70px;
                width: 100%;
                background-color: #728DC1;
            }
             
            h2.header {
                padding-left: 10px;
            }
            #navigation {
                position: absolute;
                top: 70px;
                height: 41px;
                width: 100%;
                background-color: #f1f1f1;
            }
            
            .pv-navbar{
                list-style-type: none;
                margin: 0;
                padding: 0;
                overflow: hidden;
            } 
            
            .pv-navbar button {
                border: none;
                padding: 10px;
                display: block;
                background-color: transparent;
            }
 
            #container {
                position: absolute;
                width: 100%;
                top: 111px;
                bottom: 0;
                background-color: #f1f1f1;
                border-top: 1px solid silver;
            }
            
            #pageimage{
                position: absolute;
                left: 10px;
                top: 10px;
                width: 49%;
                height: 770px;
                background-color: white;
                border: 1px solid silver;
            }
            
            #pagetext {
                position: absolute;
                right: 10px;
                top: 10px;
                width: 49%;
                border: 1px solid silver;
                height: 770px;
                background-color: white;
                overflow-x:auto;
            }
            
            td.hebrewline{
               direction: rtl;
               font-family: "Adobe Hebrew", serif;
               font-size: 1em;
               margin: 0;
               padding-top: 5px;
            }
           
            /* Tooltip container */
            .sic {
                position: relative;
                display: inline-block;
                color: blue;
                /*border-bottom: 1px dotted black;  */
             }

            /* Tooltip text */
            .sic .sicsupplied {
                visibility: hidden;
                width: 120px;
                background-color: gray;
                color: #fff;
                text-align: center;
                padding: 5px 0;
                border-radius: 6px;
 
                /* Position the tooltip text - see examples below! */
                position: absolute;
                z-index: 1;
             }

            /* Show the tooltip text when you mouse over the tooltip container */
            .sic:hover .sicsupplied {
                visibility: visible;
            }
            
            table.textlines {
                
                width: 100%;
            }
            td.linenumber {
                direction: rtl;
                font-family: Arial, sans-serif;
                padding-left: 10px;
            }
            
          
        </style>
    </head>
    <body>
        <div id="viewerheader">
            <h2 class="header">BOOK-DARE-M-US-PHL-UPL-LJS.453 - Page 0493</h2>
        </div>
        
        <div id="navigation">
            <ul class="pv-navbar"> 
                <li style="float: left;">
                    <button title="Vertically">
                        <img src="images/stack_vertically.png" alt="Vertically">
                    </button>
                </li>
                <li style="float: left;">
                    <button title="Horizontally">
                        <img src="images/stack_horizontally.png" alt="Horizontally">
                    </button>
                </li>
            </ul>
        </div>
        
        <div id="container">
            <div id="pageimage">
            </div>
            
            <script type="text/javascript">
                var viewer = OpenSeadragon({
                    id: "pageimage",
                    prefixUrl: "js/openseadragonimages/",
                    tileSources: {
                        type: 'image',
                        url:  'https://bilderberg.uni-koeln.de/images/books/BOOK-DARE-M-US-PHL-UPL-LJS.453/bigjpg/BOOK-DARE-M-US-PHL-UPL-LJS.453-0493.jpg',
                        buildPyramid: false
                    }
                });
            </script>
            
            <div id="pagetext">
                <table class="textlines">
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">1</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">2</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">3</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">4</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">5</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">6</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">7</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">8</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">9</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">-</td>
                        <td class="linenumber">10</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">ואולם חלוף זמני עבור ב"ח הנה הסבה הקרובה חלוף גופו
                            בגודל וקטנות.</td>
                        <td class="linenumber">11</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">וחלוף כח הזרע המבשל לעובר וחלוף זמן חייהם ר"ל זמן
                            הגידול וזמן בחרות הב"ח וזמן זקנותו</td>
                        <td class="linenumber">12</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> וזמן ישישותו וזה כי זמן העבור הוא מדת שלמות יצירתו וזה ישוב אל מזגו
                            וגודל גופו וכן </td>
                        <td class="linenumber">13</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> הזמנים הד' שיש לו חוץ לרחם ימצאו על יחס התהוותו ברחם
                            ולכן החי שימיו ארוכים</td>
                        <td class="linenumber">14</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> הוא מתעכב יותר ברחם והב"ח גדול הגוף כמו שזמן התהוותו יותר ארוך מזמן
                            התהוות ב"ח </td>
                        <td class="linenumber">15</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> קטן הגוף כן חייו יותר ארוכים מחיי קטן הגוף. ואמנם
                            היה זה כן בעבור החום והלחות </td>
                        <td class="linenumber">16</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> הגובר על מזגם אבל אין כל מה שחיו ארוכים גופו יותר
                            גדול ואמנם יהיה על הרוב שחיי האדם </td>
                        <td class="linenumber">17</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> ארוכים משאר ב"ח המולידים חי זולת הפיל וגופו קטן משאר
                            ב"ח. ואולם השארות האדם
                            <!--<choice>
                    <unclear>
                        <add>זמן רב הוא בעבור</add>
                    </unclear>
                    <note type="editorial">maybe these words (attested in MS Oxford, Opp. 683)
                        were not copied by mistake</note>
                </choice>-->
                        </td>
                        <td class="linenumber">18</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> מזגו שדומה למזג האויר המקיף בו ר"ל חם ולח וכבר ימצא
                            ב"ח יארך עבורו בעבור גודל גופו </td>
                        <td class="linenumber">19</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> ומעוט החום והלחות בו וזה יקרה שיהיו חייו קצרים כמו
                            הסוס והדומה לו ובכלל זמני עבור </td>
                        <td class="linenumber">20</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> הב"ח מוגבלים ומשוערים בסבובי הכוכבים ובפרט הקפותיהם
                            המפורסמות כמו סבוב</td>
                        <td class="linenumber">21</td>
                    </tr>
                    <tr>
                        <td class="hebrewline">והתנועה היומית וסבוב השמש שהוא זמן השנה וסבוב הירח
                            שהוא זמן החדש כי יראה </td>
                        <td class="linenumber">22</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> שלסבובי אלו הכוכבים <span class="sic">השם (sic)
                                    <span class="sicsupplied">רושם</span>
                            </span>
                            <!--<choice>
                    <sic>השם</sic>
                    <supplied> רושם</supplied>
                </choice>-->
                            בשעור זמן עבור הב"ח ובפרט לסבוב השמש ולזה היו זמני </td>
                        <td class="linenumber">23</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> הרבה מעבורי הב"ח אמנם ישלמו לחדשים שלמים וזה על הרוב
                            ואמנם היה לחדשים רושם לעבור </td>
                        <td class="linenumber">24</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> לפי שהוא מורכב מטבע השמש וטבע הירח ולזה יתחלף פועל
                            הירח בחדש לחלוף קבלת</td>
                        <td class="linenumber">25</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> אורה מהשמש כי כשתשלם תהיה בשמש אחר ולזה היה לה
                            בענינה מן השמש האותות </td>
                        <td class="linenumber">26</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> גדול במיני המתהוים וזה מבואר ממה שיראה בדבוקים
                            ובנגודים ובריבועים שיהיה</td>
                        <td class="linenumber">27</td>
                    </tr>
                    <tr>
                        <td class="hebrewline"> רשומה נכר בתנועות המימות והרוחות וכל הדברים אשר
                            יוחסו אל ההוייה וכאשר היה </td>
                        <td class="linenumber">28</td>
                    </tr>
                </table>
            </div>
        </div>
    </body>
</html>