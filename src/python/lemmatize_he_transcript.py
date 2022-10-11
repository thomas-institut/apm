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

nlp = spacy_udpipe.load("he")

annotations = nlp(transcript)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

print('#'.join(tokens))
print('#'.join(lemmata))

