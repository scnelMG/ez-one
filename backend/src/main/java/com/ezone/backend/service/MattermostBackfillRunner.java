package com.ezone.backend.service;

import java.nio.file.Files;
import java.nio.file.Path;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.context.ConfigurableApplicationContext;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("mysql")
public class MattermostBackfillRunner implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(MattermostBackfillRunner.class);

    private final MattermostBackfillService backfillService;
    private final boolean enabled;
    private final String noticeFile;
    private final String jobsFile;
    private final boolean exitAfterRun;
    private final ConfigurableApplicationContext applicationContext;

    @Autowired
    public MattermostBackfillRunner(
        MattermostBackfillService backfillService,
        @Value("${mattermost.backfill.enabled:false}") boolean enabled,
        @Value("${mattermost.backfill.notice-file:}") String noticeFile,
        @Value("${mattermost.backfill.jobs-file:}") String jobsFile,
        @Value("${mattermost.backfill.exit:false}") boolean exitAfterRun,
        ConfigurableApplicationContext applicationContext
    ) {
        this.backfillService = backfillService;
        this.enabled = enabled;
        this.noticeFile = noticeFile;
        this.jobsFile = jobsFile;
        this.exitAfterRun = exitAfterRun;
        this.applicationContext = applicationContext;
    }

    MattermostBackfillRunner(
        MattermostBackfillService backfillService,
        boolean enabled,
        String noticeFile,
        String jobsFile
    ) {
        this(backfillService, enabled, noticeFile, jobsFile, false, null);
    }

    @Override
    public void run(ApplicationArguments args) throws Exception {
        if (!enabled) {
            return;
        }
        runFile("employment-notice", "[취업] 공지사항", noticeFile);
        runFile("employment-info", "[취업] 취업정보", jobsFile);
        if (exitAfterRun && applicationContext != null) {
            applicationContext.close();
        }
    }

    private void runFile(String channelId, String channelName, String filePath) throws Exception {
        if (filePath == null || filePath.isBlank()) {
            return;
        }
        MattermostBackfillService.BackfillResult result = backfillService.backfill(
            channelId,
            channelName,
            Files.readString(Path.of(filePath))
        );
        log.info(
            "Mattermost backfill completed for {}: attemptedMessages={}, duplicateMessages={}",
            channelName,
            result.attemptedMessages(),
            result.duplicateMessages()
        );
    }
}
