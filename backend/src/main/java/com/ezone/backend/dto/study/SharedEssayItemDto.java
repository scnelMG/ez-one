package com.ezone.backend.dto.study;

public class SharedEssayItemDto {
    private String questionId;
    private Integer questionOrder;
    private String questionText;
    private String versionId;
    private String versionName;
    private String body;

    public String getQuestionId() { return questionId; }
    public void setQuestionId(String questionId) { this.questionId = questionId; }
    public Integer getQuestionOrder() { return questionOrder; }
    public void setQuestionOrder(Integer questionOrder) { this.questionOrder = questionOrder; }
    public String getQuestionText() { return questionText; }
    public void setQuestionText(String questionText) { this.questionText = questionText; }
    public String getVersionId() { return versionId; }
    public void setVersionId(String versionId) { this.versionId = versionId; }
    public String getVersionName() { return versionName; }
    public void setVersionName(String versionName) { this.versionName = versionName; }
    public String getBody() { return body; }
    public void setBody(String body) { this.body = body; }
}
