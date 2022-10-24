import simplemma
import spacy_udpipe
import qalsadi.lemmatizer
from langdetect import detect
import sys

# Decoder of the in PHP encoded transcript
def decode(transcript):
    transcript = transcript.replace("#", " ")
    transcript = transcript.replace("- ", "")
    transcript = transcript.replace("%", "(")
    transcript = transcript.replace("$", ")")
    transcript = transcript.replace("€", "׳")
    transcript = transcript.replace("\\", "")
    transcript = transcript.replace("+", "|")
    transcript = transcript.replace("°", "<")
    transcript = transcript.replace("^", ">")
    transcript = transcript.replace(";", "$")
    transcript = transcript.replace("~", "`")

    return transcript

# Get transcript from php exec-command
transcript = sys.argv[1:][0]

# Decoding
transcript = decode(transcript)

# Detect language
lang = detect(transcript)

# Tokenization and Lemmatization
if (lang=='he'):
    nlp = spacy_udpipe.load('he')
    annotations = nlp(transcript)
    tokens = [token.text for token in annotations]
    lemmata = [token.lemma_ for token in annotations]
elif (lang=='ar'):
    tokens = transcript.split(" ")
    lemmatizer = qalsadi.lemmatizer.Lemmatizer()
    lemmata = [lemmatizer.lemmatize(t) for t in tokens]
else:
    tokens = simplemma.simple_tokenizer(transcript)
    lemmata = [simplemma.lemmatize(t, lang='la') for t in tokens]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(tokens))
print('#'.join(lemmata))

