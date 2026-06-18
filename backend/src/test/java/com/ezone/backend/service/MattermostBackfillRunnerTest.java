package com.ezone.backend.service;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.mockito.Mockito;

class MattermostBackfillRunnerTest {

    @TempDir
    Path tempDir;

    @Test
    void runBackfillsConfiguredNoticeAndJobsFiles() throws Exception {
        MattermostBackfillService backfillService = Mockito.mock(MattermostBackfillService.class);
        Path noticeFile = tempDir.resolve("notice.txt");
        Path jobsFile = tempDir.resolve("jobs.txt");
        Files.writeString(noticeFile, "공지 원문");
        Files.writeString(jobsFile, "취업정보 원문");
        when(backfillService.backfill(Mockito.anyString(), Mockito.anyString(), Mockito.anyString()))
            .thenReturn(new MattermostBackfillService.BackfillResult(1, 0));

        MattermostBackfillRunner runner = new MattermostBackfillRunner(
            backfillService,
            true,
            noticeFile.toString(),
            jobsFile.toString()
        );

        runner.run(null);

        verify(backfillService).backfill("employment-notice", "[취업] 공지사항", "공지 원문");
        verify(backfillService).backfill("employment-info", "[취업] 취업정보", "취업정보 원문");
    }
}
