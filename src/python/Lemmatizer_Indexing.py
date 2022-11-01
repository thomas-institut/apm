import simplemma
import spacy_udpipe
import qalsadi.lemmatizer
import sys

# Decoder of the in PHP encoded transcript
def decode(transcript):
    transcript = transcript.replace("#", " ")
    transcript = transcript.replace("- ", "")
    transcript = transcript.replace("%", "(")
    transcript = transcript.replace("§", ")")
    transcript = transcript.replace("€", "׳")
    transcript = transcript.replace("\\", "")
    transcript = transcript.replace("+", "|")
    transcript = transcript.replace("°", "<")
    transcript = transcript.replace("^", ">")
    transcript = transcript.replace("$", ";")
    transcript = transcript.replace("~", "`")

    return transcript

# Get lang and transcript from php exec-command
lang = sys.argv[1:][0]
transcript = sys.argv[2:][0]

# Decoding
transcript = decode(transcript)

# Tokenization and Lemmatization
if (lang=='he' or lang=='jrb'):
    nlp = spacy_udpipe.load('he')
    tokens = transcript.split(" ")
    lemmata = []
    for t in tokens:
        annotations = nlp(t)
        lemma = ''.join([token.lemma_ for token in annotations])
        lemmata.append(lemma)
elif (lang=='ar'):
    tokens = transcript.split(" ")
    lemmatizer = qalsadi.lemmatizer.Lemmatizer()
    lemmata = [lemmatizer.lemmatize(t) for t in tokens]
elif (lang=='la'):
    tokens = simplemma.simple_tokenizer(transcript)
    lemmata = [simplemma.lemmatize(t, lang=lang) for t in tokens]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(tokens))
print('#'.join(lemmata))

