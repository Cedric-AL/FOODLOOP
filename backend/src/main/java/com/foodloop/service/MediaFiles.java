package com.foodloop.service;

import java.awt.*;
import java.awt.image.BufferedImage;
import java.io.*;
import javax.imageio.*;
import org.springframework.http.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

public final class MediaFiles {
 private MediaFiles(){}
 public static byte[] photo(MultipartFile file) {
  if(file==null||file.isEmpty()||file.getSize()>5*1024*1024)throw bad("Add a JPG or PNG photo up to 5 MB.");
  try(var source=file.getInputStream();var input=ImageIO.createImageInputStream(source)) {
   var readers=ImageIO.getImageReaders(input);
   if(!readers.hasNext())throw bad("The photo is not a readable JPG or PNG image.");
   ImageReader reader=readers.next();
   BufferedImage original;
   try {
    String format=reader.getFormatName();
    if(!format.equalsIgnoreCase("JPEG")&&!format.equalsIgnoreCase("PNG"))throw bad("Only JPG and PNG photos are supported.");
    reader.setInput(input,true,true);
    int width=reader.getWidth(0),height=reader.getHeight(0);
    if(width<1||height<1||(long)width*height>20_000_000)throw bad("The photo is too large. Use an image with at most 20 million pixels.");
    original=reader.read(0);
   } finally {reader.dispose();}
   double scale=Math.min(1.0,1600.0/Math.max(original.getWidth(),original.getHeight()));
   BufferedImage safe=new BufferedImage(Math.max(1,(int)(original.getWidth()*scale)),Math.max(1,(int)(original.getHeight()*scale)),BufferedImage.TYPE_INT_RGB);
   Graphics2D g=safe.createGraphics();
   try{g.setColor(Color.WHITE);g.fillRect(0,0,safe.getWidth(),safe.getHeight());g.setRenderingHint(RenderingHints.KEY_INTERPOLATION,RenderingHints.VALUE_INTERPOLATION_BILINEAR);g.drawImage(original,0,0,safe.getWidth(),safe.getHeight(),null);}finally{g.dispose();}
   ByteArrayOutputStream output=new ByteArrayOutputStream();ImageIO.write(safe,"JPEG",output);
   return output.toByteArray(); // Re-encoding strips metadata and attached content.
  } catch(IOException e){throw bad("We could not read this photo. Try another JPG or PNG.");}
 }
 public static MediaType type(byte[] bytes) {
  if(bytes.length>=5&&bytes[0]=='%'&&bytes[1]=='P'&&bytes[2]=='D'&&bytes[3]=='F'&&bytes[4]=='-')return MediaType.APPLICATION_PDF;
  if(bytes.length>=3&&(bytes[0]&255)==255&&(bytes[1]&255)==216&&(bytes[2]&255)==255)return MediaType.IMAGE_JPEG;
  if(bytes.length>=8&&(bytes[0]&255)==137&&bytes[1]=='P'&&bytes[2]=='N'&&bytes[3]=='G')return MediaType.IMAGE_PNG;
  return MediaType.APPLICATION_OCTET_STREAM;
 }
 public static ResponseEntity<byte[]> response(byte[] bytes,String filename,boolean download) {
  if(bytes==null||bytes.length==0)throw new ResponseStatusException(HttpStatus.NOT_FOUND,"No file was provided for this record.");
  return ResponseEntity.ok().contentType(type(bytes)).header("Content-Disposition",(download?"attachment":"inline")+"; filename=\""+filename+"\"").header("Cache-Control","no-store").header("X-Content-Type-Options","nosniff").header("Content-Security-Policy","sandbox; default-src 'none'; frame-ancestors 'self'").body(bytes);
 }
 private static ResponseStatusException bad(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
}
