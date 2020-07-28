<?php
/* 
 *  Copyright (C) 2016-2020 Universität zu Köln
 *
 *  This program is free software: you can redistribute it and/or modify
 *  it under the terms of the GNU General Public License as published by
 *  the Free Software Foundation, either version 3 of the License, or
 *  (at your option) any later version.
 *
 *  This program is distributed in the hope that it will be useful,
 *  but WITHOUT ANY WARRANTY; without even the implied warranty of
 *  MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 *  GNU General Public License for more details.
 *
 *  You should have received a copy of the GNU General Public License
 *  along with this program.  If not, see <https://www.gnu.org/licenses/>.
 *  
 */

namespace ThomasInstitut\EavDatabase;

use PDO;

/**
 * Class SqlEavDatabase
 *
 * An EavDatabase implementation in standard SQL
 *
 * @package ThomasInstitut\EavDatabase
 */
class SqlEavDatabase implements EavDatabase
{

    const DEFAULT_COL_ENTITY = 'entity';
    const DEFAULT_COL_ATTRIBUTE = 'attribute';
    const DEFAULT_COL_VALUE = 'value';

    /**
     * @var PDO
     */
    private $pdo;
    /**
     * @var string
     */
    private $table;
    /**
     * @var string
     */
    private $entityColumn;
    /**
     * @var string
     */
    private $attributeColumn;
    /**
     * @var string
     */
    private $valueColumn;

    public function __construct(PDO $pdo, string $tableName, array $columns = [])
    {
        $this->pdo = $pdo;
        $this->table = $tableName;

        if (count($columns) !== 3) {
            $columns = [ self::DEFAULT_COL_ENTITY, self::DEFAULT_COL_ATTRIBUTE, self::DEFAULT_COL_VALUE];
        }

        $this->entityColumn = $columns[0];
        $this->attributeColumn = $columns[1];
        $this->valueColumn = $columns[2];
    }

    /**
     * @param string $entityId
     * @param string $attribute
     * @return string
     * @throws AttributeNotFoundException
     */
    public function get(string $entityId, string $attribute): string
    {
        $query = "SELECT * FROM `$this->table` WHERE `$this->entityColumn`='$entityId' AND `$this->attributeColumn`='$attribute';";

        $rows = $this->getAllRowsForQuery($query);
        if (count($rows) === 0) {
            throw new AttributeNotFoundException();
        }
        return $rows[0][$this->valueColumn];

    }

    /**
     * Returns an associative array with all the attributes and values for the given entityId
     * The returned array MUST not be empty
     *
     * @param string $entityId
     * @return array
     * @throws EntityNotFoundException
     */
    public function getEntityData(string $entityId): array
    {

        $query = "SELECT * FROM `$this->table` WHERE `$this->entityColumn`='$entityId';";
        $rows = $this->getAllRowsForQuery($query);
        if (count($rows) === 0) {
            throw new EntityNotFoundException();
        }
        return $this->getEntityArrayFromRows($rows);
    }

    /**
     * Sets the value for the given attribute and entity.
     * MUST throw an InvalidArgumentException if either attribute or entity
     * are empty strings
     *
     * @param string $entityId
     * @param string $attribute
     * @param string $value
     * @return void
     * @throws InvalidArgumentException
     */
    public function set(string $entityId, string $attribute, string $value): void
    {
        // check the parameters
        if ($entityId === '' || $attribute === '') {
            throw new InvalidArgumentException();
        }
        // see if we need to insert or update
        $insert = false;
        try {
            $currentValue = $this->get($entityId, $attribute);
        } catch (AttributeNotFoundException $e) {
            $insert = true;
        }
        if ($insert) {
            $query = <<<EOT
                INSERT INTO `$this->table` (`$this->entityColumn`, `$this->attributeColumn`, `$this->valueColumn`)
                    VALUES ('$entityId', '$attribute', '$value');
EOT;

        } else {
            $query = <<<EOT
                UPDATE `$this->table` set `$this->valueColumn` = '$value'
                WHERE `$this->entityColumn`='$entityId' AND `$this->attributeColumn`='$attribute';
EOT;
        }
        $this->pdo->query($query);
    }

    /**
     * Deletes the given attribute for the given entity Id
     * if the given attribute is the only attribute set for the given entityId
     * the entity MUST be deleted
     * @param string $entityId
     * @param string $attribute
     */
    public function delete(string $entityId, string $attribute): void
    {
        $this->pdo->query("DELETE FROM `$this->table` WHERE `$this->entityColumn`='$entityId' AND `$this->attributeColumn`='$attribute';");

    }

    /**
     * Deletes the given entity and all its attributes
     * @param string $entityId
     */
    public function deleteEntity(string $entityId): void
    {
        $this->pdo->query("DELETE FROM `$this->table` WHERE `$this->entityColumn`='$entityId';");
    }

    private function getAllRowsForQuery(string $query) : array {
        $result = $this->pdo->query($query);
        return $result->fetchAll(PDO::FETCH_ASSOC);
    }

    private function getEntityArrayFromRows(array $rows) : array {
        $entityArray = [];
        foreach($rows as $row) {
            $entityArray[$row[$this->attributeColumn]] = $row[$this->valueColumn];
        }
        return $entityArray;

    }
}