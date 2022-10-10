import spacy_udpipe
import sys

# Get transcript from php exec-command
transcript = sys.argv[1:][0]

# Decoding
transcript = transcript.replace("#", " ")
transcript = transcript.replace("- ", "")
transcript = transcript.replace("%", "(")
transcript = transcript.replace("$", ")")

# transcript="ולחשוב כי בדעת הוא מדבר. ולב שמעו יפותה מאמרו: ואם נמצא בנצח לשונו. במאמרים מפורסמים חברו. אשר יודו בני איש בם ויכיר. לחסרונם חכם לבב מהירו. ואם אין זה הֲדעת חק ומשפט שלימות זה ומותרו ואסרו. ואם נברא להתחכם ולעסוק. בדין ממון וקלו וחמורו. להבין איך יהיה משפט מריבים. עלי דבר ונזק שור ובורו. וקרבן שגגת איש או זדונו"
nlp = spacy_udpipe.load("he")

annotations = nlp(transcript)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

print('#'.join(tokens))
print('#'.join(lemmata))

