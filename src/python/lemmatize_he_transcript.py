import spacy_udpipe

# spacy_udpipe.download("he")

transcript="ולחשוב כי בדעת הוא מדבר. ולב שמעו יפותה מאמרו: ואם נמצא בנצח לשונו. במאמרים מפורסמים חברו. אשר יודו בני איש בם ויכיר. לחסרונם חכם לבב מהירו. ואם אין זה הֲדעת חק ומשפט שלימות זה ומותרו ואסרו. ואם נברא להתחכם ולעסוק. בדין ממון וקלו וחמורו. להבין איך יהיה משפט מריבים. עלי דבר ונזק שור ובורו. וקרבן שגגת איש או זדונו"
nlp = spacy_udpipe.load("he")

annotations = nlp(transcript)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

print(tokens)
print(lemmata)

if (len(tokens) == len(lemmata)):
    print ("Success!")
else:
    print ("Error!")
