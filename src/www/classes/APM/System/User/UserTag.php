<?php

namespace APM\System\User;

class UserTag
{
    const ROOT = 'root';
    const DISABLED = 'disabled';
    const READ_ONLY = 'readOnly';
    const CREATE_DOCUMENTS = 'canCreateDocs';

    const EDIT_DOCUMENTS = 'canEditDocuments';
    const DEFINE_PAGES = 'canDefinePages';
    const MANAGE_USERS = 'canManageUsers';
}