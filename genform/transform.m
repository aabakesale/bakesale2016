A = xlsread('/Users/kwen0127/Documents/aapp2/bakesale2016/genform/bakeorder.xlsx');
csvFileName = strrep('/Users/kwen0127/Documents/aapp2/bakesale2016/genform/bakeorder.xlsx', '.xlsx', '.csv');
csvwrite(csvFileName, A);


%fid = fopen('/Users/kwen0127/Documents/aapp2/bakesale2016/genform/bakeorder.xlsx', 'r', 'n', 'UTF-8');
fid = fopen('/Users/kwen0127/Documents/aapp2/bakesale2016/genform/bakeorder.csv','rt');
fout = fopen('/Users/kwen0127/Documents/aapp2/bakesale2016/genform/bakeorder.txt','w');

fprintf(fout,'doctype html\n');
fprintf(fout,'head\n');
fprintf(fout,'  title �q�次��\n');
fprintf(fout,'  link(rel=''stylesheet'', href=''/style.css'')\n');
fprintf(fout,'\n');
fprintf(fout,'body\n');
fprintf(fout,'  h1 �q�次��\n');
fprintf(fout,'  form.form(action=''/submit'')\n');
fprintf(fout,'    table.table\n');
fprintf(fout,'      thead\n');
fprintf(fout,'        tr\n');
fprintf(fout,'          th �~��\n');
fprintf(fout,'          th ���(Unit Price)\n');
fprintf(fout,'          th �X��(Unit)\n');
fprintf(fout,'          th �Ƶ�\n');
fprintf(fout,'      tbody\n');
while (~feof(fid))
    raw=strtrim(fgetl(fid));
    fprintf(fout,'        tr\n');
    SplitStr=regexp(raw,',','split');
    fprintf(fout,'          td %s\n',SplitStr{1,1});
    fprintf(fout,'          td %s\n',SplitStr{1,2});
    fprintf(fout,'          td\n');
    fprintf(fout,'            input(name=''order[%s]''\n',SplitStr{1,1});
    fprintf(fout,'          td\n');
    fprintf(fout,'    button.submit#submit ����\n');   
end
fclose(fid);