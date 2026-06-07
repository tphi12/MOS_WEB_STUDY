const database = db.getSiblingDB("mos_web_study");
const now = new Date();
const demoPasswordHash =
  "mos-demo-salt:113240e7dbb84d955814d01d4517608d2173a264c226dc58d177cc3acf4a0c2915fd22baa43272df565dd275c660e824e61027750db19b7e0ed91fc92c0193cd";

database.users.drop();
database.questions.drop();
database.blueprints.drop();
database.attempts.drop();
database.lessonProgress.drop();
database.practicalAttempts.drop();

database.users.insertMany([
  {
    id: "u-admin",
    role: "admin",
    name: "Admin MOS Center",
    email: "admin@mos.edu.vn",
    passwordHash: demoPasswordHash,
    lastLoginAt: now.toISOString(),
  },
  {
    id: "u-student-1",
    role: "student",
    name: "Trần Minh Anh",
    email: "anh@student.edu.vn",
    passwordHash: demoPasswordHash,
    lastLoginAt: new Date(now.getTime() - 2 * 86400000).toISOString(),
  },
  {
    id: "u-student-2",
    role: "student",
    name: "Lê Quốc Bảo",
    email: "bao@student.edu.vn",
    passwordHash: demoPasswordHash,
    lastLoginAt: new Date(now.getTime() - 9 * 86400000).toISOString(),
  },
]);

const lessons = [
  {
    id: "page-setup-document-properties",
    name: "Thiết lập tài liệu",
    domain: "manage-documents",
    skillTags: ["layout", "page-setup", "print-preview"],
    topics: [
      mcq("đặt khổ giấy A4 và hướng trang trước khi định dạng sâu.", "Layout > Size > A4, sau đó chọn Orientation phù hợp.", ["Home > Font > Times New Roman", "Insert > Page Number > Top of Page", "Review > Spelling & Grammar"]),
      mcq("căn lề trái 3cm theo yêu cầu báo cáo.", "Layout > Margins > Custom Margins và nhập Left 3cm.", ["Kéo ruler bằng mắt đến khi thấy vừa", "Bấm Tab đầu mỗi dòng", "Dùng Space để đẩy văn bản sang phải"]),
      mcq("kiểm tra tài liệu có tràn lề khi in.", "Mở File > Print để xem Print Preview.", ["Dùng Zoom 200% trong trang soạn thảo", "Chỉ đọc lại ở chế độ Draft", "Gửi file ngay vì Word tự căn lề"]),
      mcq("thêm viền trang nghiêm túc cho báo cáo.", "Mở Design > Page Borders và chọn viền đơn giản.", ["Insert > Shapes rồi vẽ khung bằng tay", "Dùng Table bao quanh toàn bộ trang", "Chèn ảnh khung vào Header"]),
      mcq("bảng rộng cần nằm ngang nhưng phần khác vẫn dọc.", "Tạo Section Break riêng cho phần cần Landscape.", ["Đổi Orientation cả tài liệu sang Landscape", "Thu nhỏ font toàn bộ tài liệu", "Dùng Enter để đẩy bảng sang trang khác"]),
      mcq("định dạng font toàn bộ tài liệu ổn định.", "Dùng Styles hoặc chọn toàn bộ nội dung rồi áp dụng font/cỡ chữ nhất quán.", ["Sửa từng dòng khi thấy khác font", "Copy định dạng từ file khác mà không kiểm tra", "Chỉ sửa tiêu đề vì thân bài tự đúng"]),
      mcq("đặt khoảng cách header/footer đúng yêu cầu.", "Mở Page Setup hoặc Header/Footer options để chỉnh khoảng cách.", ["Nhấn Enter trong header nhiều lần", "Kéo chữ trong header bằng Space", "Tăng line spacing của toàn tài liệu"]),
      mcq("xuất PDF nhưng cần giữ bố cục.", "Xem Print Preview trước, sau đó Save As/Export PDF.", ["Copy nội dung sang file mới rồi in", "Chụp màn hình từng trang", "Chỉ đổi đuôi file thành .pdf"]),
    ],
  },
  {
    id: "normal-style-paragraph",
    name: "Normal Style và Paragraph",
    domain: "insert-format-text",
    skillTags: ["paragraph", "normal-style", "line-spacing"],
    topics: [
      mcq("chuẩn hóa thân bài bằng Normal Style.", "Right click Normal > Modify, sau đó chỉnh Font và Paragraph.", ["Tô đậm đoạn đầu tiên để Word tự áp dụng", "Dùng Format Painter một lần rồi bỏ qua các đoạn sau", "Chỉ đổi font trên thanh Home"]),
      mcq("tạo thụt dòng đầu mỗi đoạn.", "Paragraph > Indentation > Special > First line.", ["Nhấn Space đầu mỗi đoạn", "Nhấn Tab đầu từng dòng", "Chèn Text Box cho mỗi đoạn"]),
      mcq("đặt giãn dòng 1.5 cho văn bản học thuật.", "Paragraph > Line spacing > 1.5 lines.", ["Nhấn Enter giữa các dòng", "Tăng font size để dòng cách xa", "Dùng Page Break sau mỗi đoạn"]),
      mcq("căn đều hai lề cho thân bài.", "Dùng Justify cho paragraph hoặc Style.", ["Căn Center toàn bộ thân bài", "Kéo ruler từng dòng", "Đổi Orientation sang Landscape"]),
      mcq("loại bỏ định dạng lạ khi copy từ web.", "Paste Special/Keep Text Only rồi áp dụng Style của tài liệu.", ["Paste bình thường và sửa từng chữ", "Đổi màu chữ thành đen là đủ", "Dùng Screenshot nội dung web"]),
      mcq("khoảng cách giữa các đoạn phải nhất quán.", "Đặt Before/After trong Paragraph.", ["Nhấn Enter thêm sau mỗi đoạn", "Đổi zoom để nhìn thoáng hơn", "Dùng Space cuối đoạn"]),
      mcq("sửa nhiều đoạn cùng định dạng nhanh.", "Cập nhật Style thay vì sửa thủ công từng đoạn.", ["Chọn từng đoạn rồi chỉnh lại riêng", "Copy đoạn đúng để dán đè lên đoạn sai", "Xóa hết định dạng bằng Backspace"]),
      mcq("kiểm tra lỗi thụt lề không đều.", "Bật Show/Hide và xem paragraph marks, tabs, spaces.", ["Chỉ nhìn bằng mắt ở zoom nhỏ", "Đổi màu nền trang", "In ra mới phát hiện"]),
    ],
  },
  {
    id: "heading-toc-navigation",
    name: "Heading và mục lục",
    domain: "create-manage-references",
    skillTags: ["heading", "toc", "field-update"],
    topics: [
      mcq("tạo cấu trúc chương/mục cho Navigation Pane.", "Áp dụng Heading 1, Heading 2, Heading 3 đúng cấp.", ["Chỉ tô đậm và phóng to tiêu đề", "Dùng bullet cho tất cả tiêu đề", "Gõ số chương bằng tay là đủ"]),
      mcq("chèn mục lục tự động.", "References > Table of Contents và chọn mẫu tự động.", ["Gõ mục lục bằng dấu chấm", "Chèn bảng 2 cột rồi nhập số trang", "Dùng Screenshot của Navigation Pane"]),
      mcq("sau khi đổi tên tiêu đề, mục lục bị cũ.", "Right click TOC > Update Field > Update entire table.", ["Chỉ chọn Update page numbers", "Xóa mục lục và gõ lại bằng tay", "Lưu file rồi mở lại là tự cập nhật"]),
      mcq("tiêu đề con hiện sai cấp trong mục lục.", "Sửa lại Style heading đúng cấp cho tiêu đề đó.", ["Tăng indent bằng Tab", "Đổi font nhỏ hơn", "Kéo tiêu đề sang phải bằng ruler"]),
      mcq("ẩn tiêu đề phụ khỏi mục lục.", "Đổi tiêu đề đó về Normal hoặc Style không nằm trong TOC.", ["Xóa tiêu đề khỏi văn bản", "Đổi màu chữ thành trắng", "Chèn tiêu đề trong Text Box"]),
      mcq("kiểm tra nhanh bố cục báo cáo dài.", "Mở Navigation Pane để xem cây heading.", ["Duyệt từng trang bằng Page Down", "Chỉ xem trang mục lục", "Đổi sang Web Layout"]),
      mcq("field mục lục không cập nhật số trang.", "Chọn TOC và cập nhật field sau khi sửa nội dung.", ["Đổi số trang trong footer bằng tay", "Thêm dấu chấm vào mục lục", "Copy mục lục sang file khác"]),
      mcq("heading bị sai font so với quy định.", "Right click Heading style > Modify để sửa định dạng.", ["Sửa một tiêu đề mẫu rồi hy vọng các tiêu đề khác đổi", "Dùng Format Painter cho từng chương", "Xóa heading và gõ lại"]),
    ],
  },
  {
    id: "page-number-section-break",
    name: "Số trang và Section Break",
    domain: "manage-documents",
    skillTags: ["section-page-number", "header-footer", "page-number"],
    topics: [
      mcq("trang bìa không hiện số, nội dung chính bắt đầu từ 1.", "Dùng Section Break, tắt Link to Previous và Format Page Numbers Start at 1.", ["Dùng Different First Page rồi bỏ qua section", "Xóa số trang trên từng trang", "Gõ số 1 bằng tay vào footer"]),
      mcq("chỉ một phần tài liệu cần header khác.", "Tạo section riêng và tắt Link to Previous.", ["Chèn Text Box trên mỗi trang", "Đổi header đầu tài liệu", "Dùng Page Break thay cho Section Break"]),
      mcq("cần xem vị trí Section Break.", "Bật Show/Hide để nhìn ký tự ẩn và break.", ["Đổi sang Print Preview", "Zoom nhỏ để thấy nhiều trang", "Mở Spelling & Grammar"]),
      mcq("số trang bị nối tiếp sai sau mục lục.", "Mở Format Page Numbers trong section cần sửa.", ["Sửa số trên từng footer", "Xóa toàn bộ footer", "Đổi font số trang"]),
      mcq("ngắt sang trang mới không cần cấu hình riêng.", "Dùng Page Break hoặc Ctrl+Enter.", ["Dùng Section Break mỗi lần sang trang", "Nhấn Enter đến khi qua trang", "Chèn trang trắng bằng Insert Picture"]),
      mcq("tách section mới và sang trang mới.", "Layout > Breaks > Next Page Section Break.", ["Continuous Break vì luôn tạo trang mới", "Column Break", "Text Wrapping Break"]),
      mcq("header section sau vẫn giống section trước.", "Tắt Link to Previous trong Header/Footer.", ["Xóa nội dung header trước", "Đổi Zoom trang sau", "Lưu file thành bản mới"]),
      mcq("cần xóa trang trắng do break dư.", "Bật Show/Hide, xác định và xóa break/paragraph mark thừa.", ["Xóa ngẫu nhiên footer", "Giảm font size toàn bộ", "Đổi margin thật nhỏ"]),
    ],
  },
  {
    id: "objects-captions-citations",
    name: "Hình, caption và citation",
    domain: "insert-format-graphic-elements",
    skillTags: ["caption", "cross-reference", "wrap-text"],
    topics: [
      mcq("thêm tên hình tự động.", "References > Insert Caption và chọn label Figure/Hình.", ["Gõ 'Hình 1' bằng tay", "Đổi tên file ảnh", "Chèn textbox dưới ảnh"]),
      mcq("tham chiếu đến hình trong đoạn văn.", "Dùng Cross-reference tới caption đã tạo.", ["Gõ số hình bằng tay", "Copy caption vào đoạn văn", "Chèn hyperlink tới file ảnh"]),
      mcq("ảnh che lên chữ sau khi chèn.", "Chỉnh Wrap Text và vị trí ảnh phù hợp.", ["Nhấn Enter quanh ảnh thật nhiều", "Đổi màu ảnh", "Chuyển sang Web Layout"]),
      mcq("số thứ tự caption sai sau khi chèn thêm hình.", "Cập nhật field/caption trong tài liệu.", ["Sửa số từng caption bằng tay", "Xóa hình cũ", "Đổi tên label"]),
      mcq("tạo danh mục hình tự động.", "Dùng Insert Table of Figures từ caption.", ["Gõ danh mục bằng tay", "Dùng Table of Contents mặc định", "Copy tất cả caption vào đầu file"]),
      mcq("ảnh cần giữ tỉ lệ khi resize.", "Kéo từ góc ảnh hoặc dùng Size với Lock aspect ratio.", ["Kéo cạnh ngang đến vừa", "Crop hết phần thừa", "Đổi Wrap Text sang Tight"]),
      mcq("chèn citation/nguồn tham khảo có quản lý.", "Dùng References > Insert Citation/Manage Sources nếu cần danh mục tự động.", ["Gõ nguồn bằng tay ở cuối file", "Đổi màu chữ citation", "Chèn comment chứa nguồn"]),
      mcq("đổi nhãn caption từ Figure sang Bảng/Hình.", "Dùng New Label hoặc chọn label phù hợp trong Insert Caption.", ["Gõ lại tất cả caption bằng tay", "Chèn label trong Text Box", "Đổi font caption"]),
    ],
  },
  {
    id: "academic-forms-appendix-export",
    name: "Bảng, form và xuất file",
    domain: "manage-tables-lists",
    skillTags: ["table", "form-layout", "export-pdf"],
    topics: [
      mcq("cần tạo phiếu khảo sát có cột câu hỏi và trả lời.", "Dùng Insert > Table để giữ bố cục ổn định.", ["Căn bằng Space", "Dùng nhiều Tab trên cùng dòng", "Chèn ảnh mẫu phiếu"]),
      mcq("các dòng bảng cao không đều.", "Dùng Distribute Rows hoặc chỉnh Table Properties.", ["Nhấn Enter trong ô", "Đổi font từng dòng", "Kéo từng dòng bằng mắt"]),
      mcq("cần tạo dòng chấm để điền thông tin.", "Dùng Tab stop với leader hoặc border phù hợp.", ["Gõ thật nhiều dấu chấm", "Dùng gạch dưới liên tục", "Chèn ảnh đường kẻ"]),
      mcq("bảng bị tràn lề khi in.", "Chỉnh AutoFit, độ rộng cột, orientation/section và kiểm tra Print Preview.", ["Giảm zoom trang soạn thảo", "Đổi màu border", "Xóa caption của bảng"]),
      mcq("tạo checkbox trong form.", "Dùng symbol/checkbox content control tùy mục đích.", ["Gõ chữ X trong ngoặc", "Chèn hình checkbox", "Dùng bullet thường"]),
      mcq("xuất file nộp bài giữ layout.", "Kiểm tra Print Preview rồi Export/Save As PDF.", ["Đổi tên .docx thành .pdf", "Chụp màn hình từng trang", "Copy sang email"]),
      mcq("phụ lục cần hiện trong mục lục.", "Áp dụng Heading cho tiêu đề phụ lục.", ["Chỉ in đậm chữ Phụ lục", "Chèn phụ lục vào footer", "Đổi màu tiêu đề"]),
      mcq("cần sắp xếp danh sách trong bảng.", "Dùng Sort trong Table Tools/Layout hoặc Home Sort.", ["Cắt dán từng dòng bằng tay", "Sắp xếp bằng cách thêm số đầu dòng", "Đổi căn lề trái phải"]),
    ],
  },
  {
    id: "administrative-documents",
    name: "Văn bản hành chính",
    domain: "manage-documents",
    skillTags: ["document-format", "inspect-document", "official-layout"],
    topics: [
      mcq("cần căn giữa quốc hiệu/tiêu ngữ.", "Dùng căn Center và định dạng paragraph, không dùng Space.", ["Gõ Space trước dòng", "Chèn Text Box cho mỗi dòng", "Dùng Tab nhiều lần"]),
      mcq("cần tạo khối nơi nhận và chữ ký ổn định.", "Dùng table không viền hoặc tab stop để căn cột.", ["Dùng Space để đẩy sang phải", "Chèn nhiều Enter", "Đổi sang Landscape"]),
      mcq("trước khi gửi file cần xóa metadata/comment ẩn.", "File > Info > Check for Issues > Inspect Document.", ["Xóa tên tác giả trên trang bìa là đủ", "Đổi tên file", "Copy nội dung sang email"]),
      mcq("chèn logo không phá bố cục.", "Chỉnh kích thước và Wrap Text/position của ảnh.", ["Kéo ảnh đến khi vừa bằng mắt", "Nhấn Enter quanh logo", "Đổi logo thành watermark"]),
      mcq("cần dòng ngày tháng đúng vị trí.", "Dùng tab stop, table không viền hoặc alignment chuẩn.", ["Gõ Space cho đến khi đúng", "Chèn ảnh dòng ngày tháng", "Đổi font nhỏ lại"]),
      mcq("văn bản có nhiều font do copy từ nguồn khác.", "Keep Text Only/Clear Formatting rồi áp dụng style chuẩn.", ["Đổi màu chữ thành đen", "In ra để kiểm tra", "Xóa dấu tiếng Việt"]),
      mcq("cần bảo vệ file trước khi gửi.", "Dùng Protect Document/Restrict Editing hoặc Encrypt tùy yêu cầu.", ["Nén file zip là đủ", "Đổi tên file khó đoán", "Chuyển sang ảnh JPG"]),
      mcq("cần kiểm tra bố cục như bản in.", "Mở File > Print/Print Preview trước khi xuất.", ["Chỉ xem ở chế độ Web Layout", "Đổi zoom 80%", "Gửi thử cho chính mình"]),
    ],
  },
  {
    id: "tips-shortcuts",
    name: "Mẹo và phím tắt",
    domain: "insert-format-text",
    skillTags: ["shortcut-speed", "editing-speed", "autocorrect"],
    topics: [
      mcq("lặp lại thao tác định dạng vừa làm.", "Nhấn F4 để repeat thao tác gần nhất.", ["Ctrl + R", "Shift + F3", "Alt + F4"]),
      mcq("chuyển chữ hoa/thường nhanh.", "Dùng Shift + F3.", ["Ctrl + Shift + C", "F9", "Ctrl + Alt + M"]),
      mcq("chèn ngắt trang nhanh.", "Dùng Ctrl + Enter.", ["Enter nhiều lần", "Ctrl + Space", "Alt + Enter"]),
      mcq("cập nhật field như mục lục/caption.", "Chọn field và nhấn F9.", ["Nhấn F4", "Nhấn Ctrl + S", "Nhấn Shift + F3"]),
      mcq("tạo cụm viết tắt dài trong văn bản hành chính.", "Dùng AutoCorrect Options để tạo replace/with.", ["Dùng Find and Replace mỗi lần", "Lưu vào clipboard", "Chèn comment mẫu"]),
      mcq("di chuyển một đoạn lên/xuống nhanh.", "Dùng Alt + Shift + mũi tên lên/xuống.", ["Ctrl + mũi tên", "Shift + Page Up", "Ctrl + Alt + M"]),
      mcq("hiện ký tự định dạng ẩn.", "Dùng Ctrl + Shift + 8 hoặc nút ¶.", ["Ctrl + H", "F7", "Ctrl + P"]),
      mcq("lưu file nhanh trong bài thi.", "Dùng Ctrl + S.", ["Ctrl + N", "Ctrl + O", "Ctrl + F"]),
    ],
  },
  {
    id: "common-errors",
    name: "Soát lỗi Word",
    domain: "manage-documents",
    skillTags: ["troubleshooting", "print-preview", "field-update"],
    topics: [
      mcq("trang trắng xuất hiện bất thường.", "Bật Show/Hide để tìm paragraph mark, page break hoặc section break thừa.", ["Giảm zoom", "Đổi font nhỏ hơn", "Xóa số trang"]),
      mcq("mục lục/caption hiện sai số.", "Cập nhật field bằng Update Field hoặc Ctrl+A rồi F9.", ["Gõ lại số bằng tay", "Đổi màu mục lục", "Lưu file thành tên khác"]),
      mcq("bảng vượt ra ngoài lề.", "Chỉnh AutoFit/độ rộng cột và kiểm tra Print Preview.", ["Đổi border thành màu nhạt", "Xóa caption bảng", "Căn center bảng"]),
      mcq("font bị nhảy sau khi dán nội dung.", "Dùng Keep Text Only/Clear Formatting rồi áp dụng style.", ["Đổi zoom trang", "Xóa dấu câu", "Đổi màu chữ"]),
      mcq("header/footer section bị nối sai.", "Kiểm tra Section Break và Link to Previous.", ["Xóa toàn bộ header", "Đổi số trang bằng tay", "Chèn header trong Text Box"]),
      mcq("ảnh làm che văn bản.", "Sửa Wrap Text/position của ảnh.", ["Nhấn Enter đến khi hết che", "Đổi màu ảnh", "Copy ảnh sang file khác"]),
      mcq("Track Changes/comment còn sót trước khi nộp.", "Review lại markup, Accept/Reject và xóa/resolve comments.", ["Ẩn markup là đủ", "Đổi file thành PDF ngay", "Xóa tab Review"]),
      mcq("cần tìm lỗi layout chỉ thấy khi in.", "Dùng Print Preview để xem tài liệu như bản nộp.", ["Đọc ở Draft view", "Zoom 50%", "Chỉ chạy spell check"]),
    ],
  },
  {
    id: "mail-merge",
    name: "Mail Merge",
    domain: "manage-documents",
    skillTags: ["mail-merge", "data-source", "preview-results"],
    topics: [
      mcq("bắt đầu tạo thư mời hàng loạt.", "Mailings > Start Mail Merge > Letters.", ["Insert > Text Box", "Review > Compare", "References > Insert Citation"]),
      mcq("kết nối danh sách người nhận từ Excel.", "Mailings > Select Recipients > Use Existing List.", ["Copy Excel vào cuối file Word", "Chèn ảnh bảng Excel", "Gõ từng tên vào thư mẫu"]),
      mcq("chèn tên người nhận vào mẫu thư.", "Dùng Insert Merge Field.", ["Gõ <<HoTen>> bằng tay không liên kết", "Dùng Comment", "Đổi tên file Excel"]),
      mcq("kiểm tra dữ liệu từng người trước khi xuất.", "Dùng Preview Results và di chuyển qua các bản ghi.", ["Finish & Merge ngay", "Chỉ xem dòng đầu Excel", "In thử trang trắng"]),
      mcq("lọc người nhận theo điều kiện.", "Dùng Edit Recipient List/Filter trong Mailings.", ["Xóa dòng trong Excel gốc không kiểm soát", "Đổi màu dòng cần lọc", "Tách file Word mới"]),
      mcq("trường merge hiện sai hoặc trống.", "Kiểm tra header cột nguồn dữ liệu và field mapping.", ["Đổi font field", "Chèn lại logo", "Tắt Preview Results"]),
      mcq("xuất kết quả ra tài liệu mới.", "Finish & Merge > Edit Individual Documents.", ["Save As file mẫu", "Print Screen từng thư", "Copy từng bản ghi"]),
      mcq("nguồn Excel tốt cho Mail Merge.", "Hàng đầu là tên cột rõ ràng, không gộp ô, không dòng trống đầu bảng.", ["Có nhiều title trang trí trên đầu", "Gộp ô cho đẹp", "Để tên cột bằng màu nền khác"]),
    ],
  },
  {
    id: "review-protect-compare",
    name: "Review và bảo vệ tài liệu",
    domain: "manage-collaboration",
    skillTags: ["track-changes", "comments", "protect-document"],
    topics: [
      mcq("theo dõi ai đã sửa nội dung.", "Bật Review > Track Changes.", ["Dùng Save As mỗi lần", "Đổi màu chữ người sửa", "Chèn watermark tên người sửa"]),
      mcq("ẩn markup có phải xóa thay đổi không.", "Không, phải Accept hoặc Reject thay đổi.", ["Có, No Markup là bản sạch", "Chỉ cần lưu file", "Chỉ cần xuất PDF"]),
      mcq("thêm góp ý không sửa trực tiếp nội dung.", "Dùng New Comment.", ["Bật Track Changes rồi xóa câu", "Chèn footnote", "Đổi màu chữ đỏ"]),
      mcq("duyệt từng thay đổi.", "Dùng Accept/Reject và Next/Previous trong Review.", ["Xóa toàn bộ đoạn có gạch", "Ẩn All Markup", "Đổi view sang Read Mode"]),
      mcq("bảo vệ tài liệu chỉ cho phép đọc.", "File > Info > Protect Document hoặc Restrict Editing tùy yêu cầu.", ["Đổi tên file khó đoán", "Nén zip file", "Chèn ảnh chữ ký"]),
      mcq("so sánh hai phiên bản file.", "Review > Compare > Compare và chọn Original/Revised.", ["Mở hai cửa sổ rồi nhìn bằng mắt", "Dùng Find để tìm từng câu", "Copy đè lên file cũ"]),
      mcq("trước khi nộp bản cuối.", "Kiểm tra còn comment/tracked changes nào không và chấp nhận/từ chối hết.", ["Chỉ chọn No Markup", "Đổi màu chữ về đen", "Xóa tab Review"]),
      mcq("giới hạn người khác chỉ sửa một phần.", "Dùng Restrict Editing và chọn vùng được phép sửa.", ["Gửi file PDF cho tất cả trường hợp", "Khóa bằng password nhưng không chia sẻ", "Chèn Text Box vào vùng cần sửa"]),
    ],
  },
];

const difficulties = ["foundation", "medium", "advanced"];

function mcq(prompt, correct, wrong) {
  return { prompt, correct, wrong };
}

function makeMcq(lesson, index) {
  const topic = lesson.topics[index % lesson.topics.length];
  const variant = Math.floor(index / lesson.topics.length);
  const promptPrefix = [
    "Trong bài thi MOS Word,",
    "Khi thao tác trong Word 2021,",
    "Để tránh mất điểm MOS,",
  ][variant % 3];
  const options = shuffleOptions([topic.correct, ...topic.wrong], `${lesson.id}-${index}`);

  return {
    id: `mcq-${lesson.id}-${String(index + 1).padStart(2, "0")}`,
    domain: lesson.domain,
    skillTags: lesson.skillTags,
    type: "multiple-choice",
    difficulty: difficulties[index % difficulties.length],
    title: `${lesson.name} - câu ${index + 1}`,
    prompt: `${promptPrefix} ${topic.prompt}`,
    options,
    expectedAnswer: topic.correct,
    estimatedSeconds: 45 + (index % 3) * 15,
    points: 5,
  };
}

function shuffleOptions(options, seedText) {
  const uniqueOptions = options.filter((option, index, list) => list.indexOf(option) === index);
  const sorted = [...uniqueOptions];
  let seed = [...seedText].reduce((total, char) => total + char.charCodeAt(0), 0);
  for (let index = sorted.length - 1; index > 0; index -= 1) {
    seed = (seed * 9301 + 49297) % 233280;
    const swapIndex = seed % (index + 1);
    [sorted[index], sorted[swapIndex]] = [sorted[swapIndex], sorted[index]];
  }
  return sorted;
}

const questions = lessons.flatMap((lesson) => Array.from({ length: 20 }, (_, index) => makeMcq(lesson, index)));

database.questions.insertMany(questions);

const blueprints = lessons.map((lesson) => ({
  id: `test-${lesson.id}`,
  name: `Test ${lesson.name}`,
  description: "Bài test multiple-choice 20 câu theo từng phần để lấy dữ liệu personalize.",
  lessonId: lesson.id,
  totalQuestions: 20,
  durationMinutes: 30,
  mosScaleMin: 0,
  mosScaleMax: 100,
  questionTypes: ["multiple-choice"],
  domainMatrix: [{ domain: lesson.domain, percent: 100, difficulties }],
}));

blueprints.push({
  id: "final-mos-word-multiple-choice",
  name: "Final MOS Word Multiple Choice",
  description: "Bài trắc nghiệm cuối khóa 50 câu tổng hợp tất cả kỹ năng.",
  totalQuestions: 50,
  durationMinutes: 90,
  mosScaleMin: 0,
  mosScaleMax: 100,
  questionTypes: ["multiple-choice"],
  domainMatrix: [
    { domain: "manage-documents", percent: 28, difficulties },
    { domain: "insert-format-text", percent: 18, difficulties },
    { domain: "manage-tables-lists", percent: 14, difficulties },
    { domain: "create-manage-references", percent: 16, difficulties },
    { domain: "insert-format-graphic-elements", percent: 12, difficulties },
    { domain: "manage-collaboration", percent: 12, difficulties },
  ],
});

database.blueprints.insertMany(blueprints);

database.users.deleteMany({});

const studentProfiles = [
  ...Array.from({ length: 10 }, () => "completed"),
  ...Array.from({ length: 25 }, () => "active"),
  ...Array.from({ length: 10 }, () => "starter"),
  ...Array.from({ length: 5 }, () => "at-risk"),
];
const studentNames = [
  "Nguyễn Minh Anh", "Trần Quốc Bảo", "Lê Hoàng Nam", "Phạm Thu Hà", "Võ Gia Hân",
  "Đặng Minh Khang", "Bùi Ngọc Lan", "Đỗ Hải Long", "Hồ Quỳnh Mai", "Ngô Đức Minh",
  "Dương Khánh My", "Lý Nhật Nam", "Trương Kim Ngân", "Phan Hoàng Oanh", "Mai Đức Phúc",
  "Nguyễn Thảo Phương", "Trần Minh Quân", "Lê Như Quỳnh", "Phạm Tuấn Sơn", "Võ Thanh Tâm",
  "Đặng Anh Thư", "Bùi Minh Trang", "Đỗ Quốc Trung", "Hồ Ngọc Tú", "Ngô Bảo Vy",
  "Dương Hải Yến", "Lý Minh Châu", "Trương Quốc Cường", "Phan Thùy Dung", "Mai Gia Huy",
  "Nguyễn Khánh Linh", "Trần Thành Đạt", "Lê Phương Nhi", "Phạm Công Thành", "Võ Mai Chi",
  "Đặng Quốc Khánh", "Bùi Hà My", "Đỗ Minh Nhật", "Hồ Thanh Trúc", "Ngô Quang Vinh",
  "Dương Bảo Ngọc", "Lý Anh Tuấn", "Trương Minh Thư", "Phan Gia Bảo", "Mai Thùy Linh",
  "Nguyễn Đức Anh", "Trần Ngọc Hân", "Lê Quang Huy", "Phạm Yến Nhi", "Võ Minh Triết",
];
const profileSettings = {
  completed: { loginMin: 0, loginMax: 3, lessonMin: lessons.length, lessonMax: lessons.length, attemptMin: 11, attemptMax: 15, scoreMin: 78, scoreMax: 98 },
  active: { loginMin: 0, loginMax: 6, lessonMin: 4, lessonMax: 10, attemptMin: 4, attemptMax: 9, scoreMin: 55, scoreMax: 91 },
  starter: { loginMin: 0, loginMax: 5, lessonMin: 1, lessonMax: 3, attemptMin: 1, attemptMax: 3, scoreMin: 42, scoreMax: 78 },
  "at-risk": { loginMin: 10, loginMax: 32, lessonMin: 1, lessonMax: 5, attemptMin: 2, attemptMax: 5, scoreMin: 18, scoreMax: 48 },
};

const students = studentProfiles.map((profile, index) => {
  const settings = profileSettings[profile];
  const registeredDaysAgo = clamp(Math.round(80 - index * 1.5 + seededInt(`registered-${index}`, -4, 4)), 2, 82);
  const lastLoginDaysAgo = profile === "at-risk"
    ? clamp(10 + (index - 45) * 4 + seededInt(`login-${index}`, 0, 3), settings.loginMin, settings.loginMax)
    : seededInt(`login-${index}`, settings.loginMin, settings.loginMax);
  return {
    id: `u-student-${String(index + 1).padStart(2, "0")}`,
    role: "student",
    name: studentNames[index],
    email: `student${String(index + 1).padStart(2, "0")}@mos.edu.vn`,
    passwordHash: demoPasswordHash,
    createdAt: dateDaysAgo(registeredDaysAgo, seededInt(`register-hour-${index}`, 8, 21)),
    lastLoginAt: dateDaysAgo(lastLoginDaysAgo, seededInt(`login-hour-${index}`, 7, 22)),
    seedProfile: profile,
  };
});

database.users.insertMany([
  {
    id: "u-admin",
    role: "admin",
    name: "Admin MOS Center",
    email: "admin@mos.edu.vn",
    passwordHash: demoPasswordHash,
    createdAt: dateDaysAgo(120, 8),
    lastLoginAt: now.toISOString(),
  },
  ...students.map(({ seedProfile, ...student }) => student),
]);

const generatedAttempts = [];
const generatedProgress = [];
const generatedPracticalAttempts = [];

for (const [studentIndex, student] of students.entries()) {
  const profile = student.seedProfile;
  const settings = profileSettings[profile];
  const lessonCount = seededInt(`lessons-${studentIndex}`, settings.lessonMin, settings.lessonMax);
  const attemptCount = seededInt(`attempts-${studentIndex}`, settings.attemptMin, settings.attemptMax);
  const activityWindow = profile === "at-risk" ? [14, 75] : [0, Math.max(8, Math.min(75, daysBetween(student.createdAt, now.toISOString())))];

  for (let lessonIndex = 0; lessonIndex < lessonCount; lessonIndex += 1) {
    const lesson = lessons[lessonIndex];
    const isCompleted = profile === "completed" || lessonIndex < lessonCount - 1;
    const checklistPercent = isCompleted ? 100 : seededInt(`check-${studentIndex}-${lessonIndex}`, 25, 85);
    const quizPercent = isCompleted
      ? seededInt(`quiz-complete-${studentIndex}-${lessonIndex}`, 72, 100)
      : seededInt(`quiz-active-${studentIndex}-${lessonIndex}`, 20, 78);
    generatedProgress.push({
      studentId: student.id,
      lessonId: lesson.id,
      title: lesson.name,
      checkedStepIndexes: Array.from({ length: Math.round(checklistPercent / 20) }, (_, index) => index),
      quizAnswers: {},
      totalSteps: 5,
      totalLessons: lessons.length,
      totalQuizQuestions: 5,
      correctQuizCount: Math.round(quizPercent / 20),
      checklistPercent,
      quizPercent,
      scorePercent: Math.round((checklistPercent + quizPercent) / 2),
      completed: isCompleted && quizPercent >= 70,
      updatedAt: dateDaysAgo(seededInt(`progress-date-${studentIndex}-${lessonIndex}`, activityWindow[0], activityWindow[1]), seededInt(`progress-hour-${studentIndex}-${lessonIndex}`, 7, 22)),
    });
  }

  for (let attemptIndex = 0; attemptIndex < attemptCount; attemptIndex += 1) {
    const blueprint = blueprints[(studentIndex + attemptIndex) % blueprints.length];
    const blueprintQuestions = blueprint.lessonId
      ? questions.filter((question) => question.id.includes(blueprint.lessonId)).slice(0, blueprint.totalQuestions)
      : pickQuestions(questions, blueprint.totalQuestions, `final-${studentIndex}-${attemptIndex}`);
    const progressionBonus = Math.round((attemptIndex / Math.max(1, attemptCount - 1)) * (profile === "at-risk" ? 3 : 12));
    const targetScore = clamp(seededInt(`score-${studentIndex}-${attemptIndex}`, settings.scoreMin, settings.scoreMax) + progressionBonus, 10, 100);
    const submittedDaysAgo = distributedDaysAgo(
      `attempt-date-${studentIndex}-${attemptIndex}`,
      attemptIndex,
      attemptCount,
      activityWindow[0],
      activityWindow[1],
    );
    const startedAt = dateDaysAgo(submittedDaysAgo, seededInt(`attempt-hour-${studentIndex}-${attemptIndex}`, 7, 22));
    generatedAttempts.push(makeAttempt(student.id, blueprint.id, blueprintQuestions, targetScore, startedAt, studentIndex, attemptIndex));
  }

  const practicalCount = profile === "completed" ? 4 : profile === "active" ? seededInt(`practical-${studentIndex}`, 1, 3) : profile === "starter" ? seededInt(`practical-${studentIndex}`, 0, 1) : 1;
  for (let practicalIndex = 0; practicalIndex < practicalCount; practicalIndex += 1) {
    const officeFinal = practicalIndex >= 2 || (profile === "completed" && practicalIndex >= practicalCount - 2);
    const practicalTestId = officeFinal
      ? ["practical-final-office-academic", "practical-final-office-professional"][practicalIndex % 2]
      : `practical-${lessons[(studentIndex + practicalIndex) % lessons.length].id}`;
    const baseScore = profile === "completed" ? 82 : profile === "active" ? 67 : profile === "starter" ? 54 : 32;
    const score = clamp(baseScore + seededInt(`practical-score-${studentIndex}-${practicalIndex}`, -12, 13), 10, 100);
    const submittedDaysAgo = distributedDaysAgo(
      `practical-date-${studentIndex}-${practicalIndex}`,
      practicalIndex,
      practicalCount,
      activityWindow[0],
      activityWindow[1],
    );
    generatedPracticalAttempts.push({
      id: `practical-seed-${student.id}-${practicalIndex + 1}`,
      studentId: student.id,
      practicalTestId,
      startedAt: dateDaysAgo(submittedDaysAgo, seededInt(`practical-hour-${studentIndex}-${practicalIndex}`, 8, 21)),
      submittedAt: dateDaysAgo(submittedDaysAgo, seededInt(`practical-hour-submit-${studentIndex}-${practicalIndex}`, 9, 22)),
      content: "<p>Bài thực hành đã hoàn thành trong dữ liệu mô phỏng.</p>",
      score,
      checkResults: Array.from({ length: 10 }, (_, checkIndex) => ({
        checkId: `seed-check-${checkIndex + 1}`,
        taskId: `task-${Math.floor(checkIndex / 2) + 1}`,
        label: `Tiêu chí thực hành ${checkIndex + 1}`,
        points: 10,
        earnedPoints: checkIndex < Math.round(score / 10) ? 10 : 0,
        passed: checkIndex < Math.round(score / 10),
      })),
    });
  }
}

database.attempts.insertMany(generatedAttempts);
database.lessonProgress.insertMany(generatedProgress);
database.practicalAttempts.insertMany(generatedPracticalAttempts);

function makeAttempt(studentId, blueprintId, selectedQuestions, targetScore, startedAt, studentIndex, attemptIndex) {
  const correctTarget = Math.round((targetScore / 100) * selectedQuestions.length);
  const rankedQuestions = [...selectedQuestions].sort((left, right) =>
    seededNumber(`correct-${studentIndex}-${attemptIndex}-${left.id}`) - seededNumber(`correct-${studentIndex}-${attemptIndex}-${right.id}`),
  );
  const correctIds = new Set(rankedQuestions.slice(0, correctTarget).map((question) => question.id));
  const answers = selectedQuestions.map((question, answerIndex) => {
    const isCorrect = correctIds.has(question.id);
    const wrongAnswer = question.options?.find((option) => option !== question.expectedAnswer) ?? "Chưa xác định";
    return {
      questionId: question.id,
      answer: isCorrect ? question.expectedAnswer : wrongAnswer,
      elapsedSeconds: seededInt(`seconds-${studentIndex}-${attemptIndex}-${answerIndex}`, isCorrect ? 35 : 55, isCorrect ? 85 : 125),
      isCorrect,
    };
  });
  const score = Math.round((correctTarget / selectedQuestions.length) * 100);
  const durationSeconds = answers.reduce((sum, answer) => sum + answer.elapsedSeconds, 0);
  return {
    id: `attempt-seed-${studentId}-${attemptIndex + 1}`,
    studentId,
    blueprintId,
    questionIds: selectedQuestions.map((question) => question.id),
    startedAt,
    submittedAt: new Date(new Date(startedAt).getTime() + durationSeconds * 1000).toISOString(),
    rawScore: score,
    mosScore: score,
    answers,
  };
}

function pickQuestions(items, count, seed) {
  return [...items]
    .sort((left, right) => seededNumber(`${seed}-${left.id}`) - seededNumber(`${seed}-${right.id}`))
    .slice(0, count);
}

function seededNumber(seedText) {
  let value = 2166136261;
  for (const character of seedText) {
    value ^= character.charCodeAt(0);
    value = Math.imul(value, 16777619);
  }
  return (value >>> 0) / 4294967295;
}

function seededInt(seedText, min, max) {
  return Math.floor(seededNumber(seedText) * (max - min + 1)) + min;
}

function dateDaysAgo(daysAgo, hour) {
  const date = new Date(now);
  date.setDate(date.getDate() - daysAgo);
  date.setHours(hour, seededInt(`minute-${daysAgo}-${hour}`, 0, 59), 0, 0);
  return date.toISOString();
}

function daysBetween(from, to) {
  return Math.max(0, Math.floor((new Date(to).getTime() - new Date(from).getTime()) / 86400000));
}

function distributedDaysAgo(seedText, index, total, min, max) {
  const range = Math.max(0, max - min);
  const position = total <= 1 ? 0.5 : index / (total - 1);
  return clamp(Math.round(max - position * range + seededInt(seedText, -3, 3)), min, max);
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

database.users.createIndex({ id: 1 }, { unique: true });
database.questions.createIndex({ id: 1 }, { unique: true });
database.questions.createIndex({ domain: 1, difficulty: 1 });
database.questions.createIndex({ skillTags: 1 });
database.blueprints.createIndex({ id: 1 }, { unique: true });
database.attempts.createIndex({ id: 1 }, { unique: true });
database.attempts.createIndex({ studentId: 1, submittedAt: -1 });
database.lessonProgress.createIndex({ studentId: 1, lessonId: 1 }, { unique: true });
database.practicalAttempts.createIndex({ id: 1 }, { unique: true });
database.practicalAttempts.createIndex({ studentId: 1, submittedAt: -1 });

printjson({
  ok: 1,
  database: "mos_web_study",
  users: database.users.countDocuments(),
  questions: database.questions.countDocuments(),
  blueprints: database.blueprints.countDocuments(),
  attempts: database.attempts.countDocuments(),
  lessonProgress: database.lessonProgress.countDocuments(),
  practicalAttempts: database.practicalAttempts.countDocuments(),
});
