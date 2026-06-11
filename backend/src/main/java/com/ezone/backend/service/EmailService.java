package com.ezone.backend.service;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender javaMailSender;

    public EmailService(JavaMailSender javaMailSender) {
        this.javaMailSender = javaMailSender;
    }

    @Async
    public void sendStudyInviteEmail(String to, String studyName) {
        try {
            MimeMessage message = javaMailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");

            helper.setTo(to);
            helper.setSubject("[EZ-ONE] '" + studyName + "' 취업 스터디 초대");

            String htmlContent = "<h2>EZ-ONE 취업 스터디 초대</h2>"
                    + "<p>안녕하세요, <b>" + studyName + "</b> 스터디에서 귀하를 초대했습니다.</p>"
                    + "<p>지금 EZ-ONE 플랫폼에 접속하셔서 스터디 초대를 수락하고 팀원들과 자소서를 공유해보세요!</p>"
                    + "<br/>"
                    + "<a href=\"http://localhost:5173/study\" style=\"padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;\">스터디 확인하러 가기</a>";

            helper.setText(htmlContent, true);

            javaMailSender.send(message);
        } catch (MessagingException e) {
            // Log error
            System.err.println("Failed to send email to " + to + ": " + e.getMessage());
        }
    }
}
