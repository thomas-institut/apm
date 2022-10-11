import spacy_udpipe
import sys

# Get transcript from php exec-command
transcript = sys.argv[1:][0]

# Decoding
transcript = transcript.replace("#", " ")
transcript = transcript.replace("- ", "")
transcript = transcript.replace("%", "(")
transcript = transcript.replace("$", ")")
transcript = transcript.replace("€", "׳")
transcript = transcript.replace("\\", "")


# Tokenize and lemmatize
nlp = spacy_udpipe.load("ar")
annotations = nlp(transcript)
transcript_tokenized = [token.text for token in annotations]
transcript_lemmatized = [token.lemma_ for token in annotations]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(transcript_tokenized))
print('#'.join(transcript_lemmatized))

# OLD CODE USING QALSADI
"""
import qalsadi.lemmatizer
import sys

# Get transcript from php exec-command
transcript = sys.argv[1:][0]

# Decoding
transcript = transcript.replace("#", " ")
transcript = transcript.replace("- ", "")
transcript = transcript.replace("%", "(")
transcript = transcript.replace("$", ")")

# Get tokens
#transcript_tokenized = transcript.split(" ")

# Get lemmata
#lemmatizer = qalsadi.lemmatizer.Lemmatizer()
#transcript_lemmatized = [lemmatizer.lemmatize(t) for t in transcript_tokenized]

# Encode and print tokens and lemmata to work with them in php
print('#'.join(transcript_tokenized))
print('#'.join(transcript_lemmatized))
"""


