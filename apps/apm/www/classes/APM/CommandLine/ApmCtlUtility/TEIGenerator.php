<?php

namespace APM\CommandLine\ApmCtlUtility;

/**
 * Generates TEI XML from edition data.
 */
class TEIGenerator
{
    /**
     *
     * @param string $title
     * @param array $mainText
     * @param array $apparatuses
     * @param array $witnesses
     * @param string $lang
     * @param string $desc
     * @param string $date
     * @param array $siglas
     * @return string
     */
    public function generateTEI(
        string $title,
        array $mainText,
        array $apparatuses,
        array $witnesses,
        string $lang = "",
        string $desc = "",
        string $date = "",
        array $siglas = []
    ): string {
        $witnessesFormatted = $this->formatWitnessesForTei($witnesses);
        $siglaMap = $this->buildSiglaMap($witnesses);
        [$appsByStart, $appsByEnd] = $this->indexApparatusEntries($apparatuses);

        $body = $this->renderTeiBody($mainText, $appsByStart, $appsByEnd, $siglaMap);

        $xml = $this->buildTeiDocument($title, $witnessesFormatted, $body);

        return $this->formatXmlIfPossible($xml);
    }

    /**
     * Converts text content to an XML-safe TEI fragment.
     *
     * @param string|array $text
     * @return string
     */
    private function fmtTextToString(string|array $text): string
    {
        if (is_string($text)) {
            return htmlspecialchars($text);
        }

        $out = "";
        $currentItalic = "";

        foreach ($text as $part) {
            $isItalic = isset($part->fontStyle) && $part->fontStyle === 'italic';
            $content = $this->extractEscapedTextContent($part);

            if ($isItalic) {
                $currentItalic .= $content;
                continue;
            }

            if ($currentItalic !== "") {
                $out .= '<hi rend="italic">' . $currentItalic . '</hi>';
                $currentItalic = "";
            }

            $out .= $content;
        }

        if ($currentItalic !== "") {
            $out .= '<hi rend="italic">' . $currentItalic . '</hi>';
        }

        return $out;
    }

    /**
     * Formats the TEI witness list.
     *
     * @param array $witnesses
     * @return string
     */
    private function formatWitnessesForTei(array $witnesses): string
    {
        $witnessesFormatted = "";

        foreach ($witnesses as $witness) {
            $witnessesFormatted .= "\n<witness xml:id=\"$witness->siglum\">$witness->title</witness>";
        }

        return $witnessesFormatted;
    }

    /**
     * Builds a witness index to siglum map.
     *
     * @param array $witnesses
     * @return array
     */
    private function buildSiglaMap(array $witnesses): array
    {
        $siglaMap = [];

        foreach ($witnesses as $index => $witness) {
            $siglaMap[$index] = $witness->siglum;
        }

        return $siglaMap;
    }

    /**
     * Indexes apparatus entries by start and end token.
     *
     * @param array $apparatuses
     * @return array
     */
    private function indexApparatusEntries(array $apparatuses): array
    {
        $appsByStart = [];
        $appsByEnd = [];

        foreach ($apparatuses as $apparatus) {
            $type = is_object($apparatus->type) ? $apparatus->type->value : $apparatus->type;

            if ($type === 'marginalia') {
                continue;
            }

            foreach ($apparatus->entries as $entry) {
                $entry->appType = $type;
                $appsByStart[$entry->from][] = $entry;
                $appsByEnd[$entry->to][] = $entry;
            }
        }

        return [$appsByStart, $appsByEnd];
    }

    /**
     * Renders the TEI body for main text and apparatus entries.
     *
     * @param array $mainText
     * @param array $appsByStart
     * @param array $appsByEnd
     * @param array $siglaMap
     * @return string
     */
    private function renderTeiBody(array $mainText, array $appsByStart, array $appsByEnd, array $siglaMap): string
    {
        $body = "";
        $isParagraphOpen = false;
        $currentParagraphTag = 'p';
        $openAppsStack = [];
        $inItalic = false;

        $closeItalic = function () use (&$body, &$inItalic) {
            if ($inItalic) {
                $body .= '</hi>';
                $inItalic = false;
            }
        };

        foreach ($mainText as $index => $token) {
            if ($this->requiresItalicClosureBeforeStructureChange($token, $index, $appsByStart, $appsByEnd)) {
                $closeItalic();
            }

            if (!$isParagraphOpen && $token->type !== 'paragraph_end') {
                $currentParagraphTag = $this->determineParagraphTag($mainText, $index);
                $body .= "\n<$currentParagraphTag>";
                $isParagraphOpen = true;
            }

            if (isset($appsByStart[$index])) {
                $this->sortApparatusEntriesForOpening($appsByStart[$index]);

                foreach ($appsByStart[$index] as $entry) {
                    $body .= sprintf(
                        "\n<app type=\"%s\">\n<lem>",
                        htmlspecialchars($entry->appType)
                    );
                    $openAppsStack[] = $entry;
                }
            }

            $this->appendRenderedToken($body, $mainText, $index, $token, $inItalic, $closeItalic);

            while (!empty($openAppsStack) && end($openAppsStack)->to === $index) {
                $closeItalic();

                $entry = array_pop($openAppsStack);
                $body .= "\n</lem>";
                $body .= $this->renderApparatusReadings($entry, $siglaMap);
                $body .= "\n</app>\n";
            }

            if ($token->type === 'paragraph_end' && $isParagraphOpen) {
                $body .= "</$currentParagraphTag>\n";
                $isParagraphOpen = false;
            }
        }

        while (!empty($openAppsStack)) {
            $closeItalic();
            array_pop($openAppsStack);
            $body .= "\n</lem>\n</app>\n";
        }

        if ($isParagraphOpen) {
            $closeItalic();
            $body .= "</$currentParagraphTag>\n";
        }

        return $body;
    }

    /**
     * Checks whether italic markup must be closed before a structural change.
     *
     * @param object $token
     * @param int $index
     * @param array $appsByStart
     * @param array $appsByEnd
     * @return bool
     */
    private function requiresItalicClosureBeforeStructureChange(object $token, int $index, array $appsByStart, array $appsByEnd): bool
    {
        return $token->type === 'paragraph_end'
            || isset($appsByStart[$index])
            || isset($appsByEnd[$index]);
    }

    /**
     * Determines the paragraph tag for the current block.
     *
     * @param array $mainText
     * @param int $startIndex
     * @return string
     */
    private function determineParagraphTag(array $mainText, int $startIndex): string
    {
        $style = 'normal';

        for ($i = $startIndex; $i < count($mainText); $i++) {
            if ($mainText[$i]->type === 'paragraph_end') {
                $style = $mainText[$i]->style;
                break;
            }
        }

        return $style === 'h2' ? 'head' : 'p';
    }

    /**
     * Sorts apparatus entries so nested XML remains valid.
     *
     * @param array $entries
     * @return void
     */
    private function sortApparatusEntriesForOpening(array &$entries): void
    {
        usort($entries, function ($a, $b) {
            if ($b->to !== $a->to) {
                return $b->to <=> $a->to;
            }

            return strcmp($a->appType, $b->appType);
        });
    }

    /**
     * Appends a single token to the body.
     *
     * @param string $body
     * @param array $mainText
     * @param int $index
     * @param object $token
     * @param bool $inItalic
     * @param callable $closeItalic
     * @return void
     */
    private function appendRenderedToken(
        string &$body,
        array $mainText,
        int $index,
        object $token,
        bool &$inItalic,
        callable $closeItalic
    ): void {
        if ($token->type === 'text') {
            foreach ($token->text as $part) {
                $isPartItalic = isset($part->fontStyle) && $part->fontStyle === 'italic';
                $content = $this->extractEscapedTextContent($part);

                if ($isPartItalic && !$inItalic) {
                    $body .= '<hi rend="italic">';
                    $inItalic = true;
                } elseif (!$isPartItalic && $inItalic) {
                    $body .= '</hi>';
                    $inItalic = false;
                }

                $body .= $content;
            }

            return;
        }

        if ($token->type === 'glue') {
            $nextIsItalic = $this->nextTokenStartsWithItalicText($mainText, $index);

            if ($inItalic && !$nextIsItalic) {
                $closeItalic();
            }

            $body .= ' ';
            return;
        }

        if ($token->type === 'page_break') {
            $body .= '<pb/>';
            return;
        }

        if ($token->type === 'column_break') {
            $body .= '<cb/>';
            return;
        }

        if ($token->type === 'line_break') {
            $body .= '<lb/>';
        }
    }

    /**
     * Checks whether the next token starts with italic text.
     *
     * @param array $mainText
     * @param int $index
     * @return bool
     */
    private function nextTokenStartsWithItalicText(array $mainText, int $index): bool
    {
        if (!isset($mainText[$index + 1]) || $mainText[$index + 1]->type !== 'text') {
            return false;
        }

        $nextToken = $mainText[$index + 1];

        return !empty($nextToken->text)
            && isset($nextToken->text[0]->fontStyle)
            && $nextToken->text[0]->fontStyle === 'italic';
    }

    /**
     * Extracts escaped text content from a structured text part.
     *
     * @param object $part
     * @return string
     */
    private function extractEscapedTextContent(object $part): string
    {
        if (isset($part->text)) {
            return htmlspecialchars($part->text);
        }

        if (isset($part->type) && $part->type === 'glue') {
            return ' ';
        }

        return "";
    }

    /**
     * Renders apparatus readings.
     *
     * @param object $entry
     * @param array $siglaMap
     * @return string
     */
    private function renderApparatusReadings(object $entry, array $siglaMap): string
    {
        $output = "";

        foreach ($entry->subEntries as $subEntry) {
            $witStr = $this->buildWitnessReferenceString($subEntry->witnessData, $siglaMap);
            $rdgText = $this->fmtTextToString($subEntry->text);

            $output .= sprintf(
                "\n<rdg wit=\"%s\">%s</rdg>",
                htmlspecialchars($witStr),
                $rdgText
            );
        }

        return $output;
    }

    /**
     * Builds a whitespace-separated witness reference string.
     *
     * @param array $witnessData
     * @param array $siglaMap
     * @return string
     */
    private function buildWitnessReferenceString(array $witnessData, array $siglaMap): string
    {
        $wits = [];

        foreach ($witnessData as $wd) {
            $siglum = $wd->siglum ?: ($siglaMap[$wd->witnessIndex] ?? '');

            if ($siglum) {
                $wits[] = '#' . $siglum;
            }
        }

        return implode(' ', $wits);
    }

    /**
     * Builds the surrounding TEI document structure.
     *
     * @param string $title
     * @param string $witnessesFormatted
     * @param string $body
     * @return string
     */
    private function buildTeiDocument(string $title, string $witnessesFormatted, string $body): string
    {
        $teiOpening = <<<XML
    <?xml version="1.0" encoding="UTF-8"?>
    <?xml-model href="http://www.tei-c.org/release/xml/tei/custom/schema/relaxng/tei_all.rng" schematypens="http://relaxng.org/ns/structure/1.0"?>
    <TEI xmlns="http://www.tei-c.org/ns/1.0">
        <teiHeader>
            <fileDesc>
                <titleStmt>
                    <title>$title</title>
                    <author>Unknown</author>
                    <respStmt>
                        <resp>Text Encoding by</resp>
                        <name>APM</name>
                    </respStmt>
                </titleStmt>
                <publicationStmt>
                    <publisher>APM</publisher>
                    <availability>
                        <p>This document is being made available for demonstration and testing purposes
                            only.</p>
                    </availability>
                </publicationStmt>
                <sourceDesc>
                    <p>The base text is a JSON encoded edition exported from the APM.</p>
                    <p/>
                </sourceDesc>
            </fileDesc>
            <encodingDesc>
                <variantEncoding method="parallel-segmentation" location="internal"/>
            </encodingDesc>
        </teiHeader>
        <text>
            <front>
                <div>
                    <listWit>$witnessesFormatted
                    </listWit>
                </div>
            </front>
            <body>
    XML;

        $teiEnd = "</body></text></TEI>";

        return $teiOpening . $body . $teiEnd;
    }

    /**
     * Formats XML when DOM parsing succeeds.
     *
     * @param string $xml
     * @return string
     */
    private function formatXmlIfPossible(string $xml): string
    {
        $dom = new \DOMDocument();
        $dom->preserveWhiteSpace = false;
        $dom->formatOutput = true;

        try {
            if ($dom->loadXML($xml)) {
                return $dom->saveXML();
            }
        } catch (\Exception $e) {
        }

        return $xml;
    }
}
