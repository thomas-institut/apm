<?php

namespace APM\System;


/**
 * Class to capture all db table names
 * used in APM
 */
final class ApmTableNames
{

    public string $settings;
    public string $edNotes;
    public string $elements;
    public string $items;
    public string $users;
    public string $tokens;
    public string $pages;
    public string $works;
    public string $presets;
    public string $txVersions;
    public string $ctVersions;
    public string $systemCache;
    public string $cTables;
    public string $mcEditions;
    public string $esStatementsDefault;
    public string $esCacheDefault;
    public string $esMerges;

    /**
     * Constructs the table names using table name
     * constants and a DB prefix
     * @param string $dbPrefix
     */
    public function __construct(string $dbPrefix)
    {
        $this->settings = $dbPrefix . 'settings';
        $this->edNotes = $dbPrefix . 'ednotes';
        $this->elements = $dbPrefix . 'elements';
        $this->items = $dbPrefix . 'items';
        $this->users = $dbPrefix . 'users';
        $this->tokens = $dbPrefix . 'tokens';
        $this->pages = $dbPrefix . 'pages';
        $this->works = $dbPrefix . 'works';
        $this->presets = $dbPrefix . 'presets';
        $this->txVersions = $dbPrefix . 'versions_tx';
        $this->ctVersions = $dbPrefix . 'versions_ct';
        $this->systemCache = $dbPrefix . 'system_cache';
        $this->cTables = $dbPrefix . 'ctables';
        $this->mcEditions = $dbPrefix . 'mc_editions';
        $this->esStatementsDefault = $dbPrefix . 'es_default_st';
        $this->esCacheDefault = $dbPrefix . 'es_default_cache';
        $this->esMerges = $dbPrefix . 'es_merges';
    }
}