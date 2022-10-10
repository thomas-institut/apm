import spacy_udpipe
import sys

# Get phrase from php exec-command
phrase = sys.argv[1:]
phrase = " ".join(phrase)

# Tokenize and lemmatize
nlp = spacy_udpipe.load("he")
annotations = nlp(phrase)
tokens = [token.text for token in annotations]
lemmata = [token.lemma_ for token in annotations]

# Print output to work with it in PHP
print('#'.join(tokens))
print('#'.join(lemmata))






