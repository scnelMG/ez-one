package com.ezone.backend.service;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.ezone.backend.domain.persistence.SharedEssayRow;
import com.ezone.backend.domain.persistence.StudyGroupRow;
import com.ezone.backend.domain.persistence.StudyMemberRow;
import com.ezone.backend.dto.study.AddFeedbackRequest;
import com.ezone.backend.dto.study.InviteUserRequest;
import com.ezone.backend.dto.study.ShareEssayRequest;
import com.ezone.backend.mapper.StudyMapper;
import com.ezone.backend.mapper.UserAccountMapper;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class StudyServiceAuthorizationTest {

    @Mock
    private StudyMapper studyMapper;

    @Mock
    private UserAccountMapper userAccountMapper;

    @Mock
    private EmailService emailService;

    @Mock
    private P1WorkspaceService p1WorkspaceService;

    @Test
    void rejectsStudyDetailForNonMember() {
        StudyService service = service();
        when(studyMapper.findStudyGroupById("study-1")).thenReturn(study("study-1"));
        when(studyMapper.findMembersByStudyId("study-1")).thenReturn(List.of(member("owner@example.com", "LEADER")));

        assertThatThrownBy(() -> service.getStudyDetail("study-1", "outsider@example.com"))
            .isInstanceOf(ForbiddenResourceException.class);
    }

    @Test
    void rejectsSharedEssayDetailForNonMember() {
        StudyService service = service();
        when(studyMapper.findMembersByStudyId("study-1")).thenReturn(List.of(member("owner@example.com", "LEADER")));

        assertThatThrownBy(() -> service.getSharedEssayDetail("study-1", "essay-1", "outsider@example.com"))
            .isInstanceOf(ForbiddenResourceException.class);
    }

    @Test
    void rejectsInviteWhenRequesterIsNotLeader() {
        StudyService service = service();
        when(studyMapper.findStudyGroupById("study-1")).thenReturn(study("study-1"));
        when(studyMapper.findMembersByStudyId("study-1")).thenReturn(List.of(member("member@example.com", "MEMBER")));

        assertThatThrownBy(() -> service.inviteUser("member@example.com", "study-1", invite("new@example.com")))
            .isInstanceOf(ForbiddenResourceException.class);

        verify(studyMapper, never()).insertStudyInvite(any());
    }

    @Test
    void rejectsShareEssayWhenWorkspaceDoesNotBelongToRequester() {
        StudyService service = service();
        when(studyMapper.findMembersByStudyId("study-1")).thenReturn(List.of(member("member@example.com", "MEMBER")));
        when(p1WorkspaceService.getWorkspace(7L, 99L)).thenThrow(new ForbiddenResourceException("Workspace access denied."));

        assertThatThrownBy(() -> service.shareEssay(
            7L,
            "member@example.com",
            "study-1",
            shareEssay("99", List.of("version-1"))
        )).isInstanceOf(ForbiddenResourceException.class);

        verify(studyMapper, never()).insertSharedEssay(any());
    }

    @Test
    void rejectsFeedbackForNonMember() {
        StudyService service = service();
        when(studyMapper.findMembersByStudyId("study-1")).thenReturn(List.of(member("owner@example.com", "LEADER")));

        assertThatThrownBy(() -> service.addEssayFeedback(
            "outsider@example.com",
            "study-1",
            "essay-1",
            feedback("Looks good")
        )).isInstanceOf(ForbiddenResourceException.class);

        verify(studyMapper, never()).insertEssayFeedback(any());
    }

    private StudyService service() {
        return new StudyService(studyMapper, userAccountMapper, emailService, p1WorkspaceService);
    }

    private StudyGroupRow study(String id) {
        StudyGroupRow row = new StudyGroupRow();
        row.setId(id);
        return row;
    }

    private StudyMemberRow member(String email, String role) {
        StudyMemberRow row = new StudyMemberRow();
        row.setUserEmail(email);
        row.setRole(role);
        return row;
    }

    private SharedEssayRow sharedEssay(String studyId) {
        SharedEssayRow row = new SharedEssayRow();
        row.setId("essay-1");
        row.setStudyId(studyId);
        row.setVersionIds("[]");
        return row;
    }

    private InviteUserRequest invite(String email) {
        InviteUserRequest request = new InviteUserRequest();
        request.setInviteeEmail(email);
        return request;
    }

    private ShareEssayRequest shareEssay(String workspaceId, List<String> versionIds) {
        ShareEssayRequest request = new ShareEssayRequest();
        request.setWorkspaceId(workspaceId);
        request.setVersionIds(versionIds);
        return request;
    }

    private AddFeedbackRequest feedback(String content) {
        AddFeedbackRequest request = new AddFeedbackRequest();
        request.setContent(content);
        return request;
    }
}
