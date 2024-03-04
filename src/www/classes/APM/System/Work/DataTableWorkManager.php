<?php

namespace APM\System\Work;

use Psr\Log\LoggerAwareTrait;
use Psr\Log\NullLogger;
use ThomasInstitut\DataTable\DataTable;

class DataTableWorkManager implements WorkManager
{
    use LoggerAwareTrait;

    private DataTable $dt;

    public function __construct(DataTable $dt)
    {
        $this->dt = $dt;
        $this->setLogger(new NullLogger());
    }

    /**
     * @inheritDoc
     */
    public function getWorkDataByDareId(string $dareId): WorkData
    {
        $rows = $this->dt->findRows([ 'dare_id' => $dareId]);
        if ($rows->count() === 0) {
            throw new WorkNotFoundException("Work '$dareId' not found");
        }
        return $this->constructWorkDataFromDatatableRow($rows->getFirst());
    }

    protected function constructWorkDataFromDatatableRow(array $row) : WorkData {
        $wd = new WorkData();
        $wd->tid = intval($row['tid'] ?? -1);
        $wd->dareId  = $row['dare_id'] ?? '';
        $wd->authorTid = intval($row['author_tid'] ?? -1);
        $wd->title = $row['title'] ?? '';
        return $wd;
    }

    /**
     * @inheritDoc
     */
    public function getWorkData(int $workTid): WorkData
    {
        $rows = $this->dt->findRows([ 'tid' => $workTid]);
        if ($rows->count() === 0) {
            throw new WorkNotFoundException("Work '$workTid' not found");
        }
        return $this->constructWorkDataFromDatatableRow($rows->getFirst());
    }

    /**
     * @inheritDoc
     */
    public function getWorksByAuthor(int $authorTid): array
    {
        $rows = $this->dt->findRows([ 'author_tid' => $authorTid]);

        $dataArray = [];
        foreach ($rows as $row) {
            $dataArray[] = $this->constructWorkDataFromDatatableRow($row);
        }
        return $dataArray;
    }
}