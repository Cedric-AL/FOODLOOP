package com.foodloop.service;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;
@Service public class ResetMailer {
 private final ObjectProvider<JavaMailSender> sender;private final String from;
 public ResetMailer(ObjectProvider<JavaMailSender> sender,@Value("${app.mail-from:}") String from){this.sender=sender;this.from=from;}
 public boolean configured(){return sender.getIfAvailable()!=null&&!from.isBlank();}
 public void send(String email,String code){SimpleMailMessage mail=new SimpleMailMessage();mail.setFrom(from);mail.setTo(email);mail.setSubject("Your Savora password reset code");mail.setText("We received a request to reset your Savora password.\n\nYour 6-digit code:\n"+code+"\n\nReturn to Savora and enter this code with your new password. The code expires in 10 minutes and works once. Never share it with anyone. If you did not request this, ignore this email.\n\nSavora");sender.getObject().send(mail);}
}
