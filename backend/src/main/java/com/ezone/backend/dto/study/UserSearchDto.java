package com.ezone.backend.dto.study;

public class UserSearchDto {
    private String email;
    private String name;
    private String nickname;

    public UserSearchDto(String email, String name, String nickname) {
        this.email = email;
        this.name = name;
        this.nickname = nickname;
    }

    public String getEmail() { return email; }
    public void setEmail(String email) { this.email = email; }
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    public String getNickname() { return nickname; }
    public void setNickname(String nickname) { this.nickname = nickname; }
}
