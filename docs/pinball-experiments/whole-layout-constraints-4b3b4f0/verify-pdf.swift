import Foundation
import AppKit
import PDFKit
let args=CommandLine.arguments
guard args.count==3, let document=PDFDocument(url:URL(fileURLWithPath:args[1])) else {fatalError("Expected readable PDF and output directory")}
let out=URL(fileURLWithPath:args[2],isDirectory:true)
var rows:[[String:Any]]=[]
for i in 0..<document.pageCount {
 guard let page=document.page(at:i) else {fatalError("Missing page")}
 let bounds=page.bounds(for:.mediaBox)
 let image=page.thumbnail(of:NSSize(width:1600,height:1300),for:.mediaBox)
 guard let data=image.tiffRepresentation, let rep=NSBitmapImageRep(data:data),let png=rep.representation(using:.png,properties:[:]) else {fatalError("PNG render failed")}
 try png.write(to:out.appendingPathComponent("pdf-page-\(i+1).png"))
 rows.append(["page":i+1,"mediaBox":[bounds.width,bounds.height],"textCharacters":page.string?.count ?? 0,"png":[rep.pixelsWide,rep.pixelsHigh]])
}
let record:[String:Any]=["pageCount":document.pageCount,"renderer":"macOS PDFKit, actual generated PDF","pages":rows]
let data=try JSONSerialization.data(withJSONObject:record,options:[.prettyPrinted,.sortedKeys])
try data.write(to:out.appendingPathComponent("pdf-check.json"));print(String(data:data,encoding:.utf8)!)
if document.pageCount != 3 {fatalError("Expected exactly three pages")}
