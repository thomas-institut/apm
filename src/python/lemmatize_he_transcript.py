from cube.api import Cube       # import the Cube object
cube=Cube(verbose=True)         # initialize it
cube.load("he", device='cpu')   # select the desired language (it will auto-download the model on first run)
text="This is the text I want segmented, tokenized, lemmatized and annotated with POS and dependencies."
document=cube(text)            # call with your own text (string) to obtain the annotations