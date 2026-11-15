// Authoring only: the application still needs no npm dependencies.
import fs from 'node:fs/promises';
import path from 'node:path';
import {createRequire} from 'node:module';
import {pathToFileURL, fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
const root=path.resolve(fileURLToPath(new URL('..',import.meta.url)));
const build=path.join(root,'.pptx-build');
const modules=process.env.RUNTIME_NODE_MODULES||process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES;
if(!modules)throw new Error('Set RUNTIME_NODE_MODULES to the presentation authoring runtime.');
const runtime=createRequire(path.join(modules,'__runtime__.cjs'));
const {Presentation,PresentationFile}=await import(pathToFileURL(runtime.resolve('@oai/artifact-tool')).href);
const {chromium}=runtime('playwright');
await fs.mkdir(build,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.PRESENTATION_BROWSER?{executablePath:process.env.PRESENTATION_BROWSER}:{})});
try{
 const page=await browser.newPage({viewport:{width:1240,height:1500},deviceScaleFactor:1.5});
 for(const name of ['submission','judging','profile']){
  await page.setContent(await fs.readFile(path.join(root,'docs/captures',name+'.html'),'utf8'));
  await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'});
  const selector=name==='submission'?'#content > .card':name==='judging'?'#content article':'#content';
  if(name==='judging')await page.addStyleTag({content:'.grid{display:block}.grid>article{width:820px}'});
  await page.locator(selector).first().screenshot({path:path.join(root,'docs/captures',name+'.png')});
 }
}finally{await browser.close()}
const deck=Presentation.create({slideSize:{width:1440,height:810}});
const C={bg:'#FAFAFF',ink:'#202144',purple:'#6655E8',muted:'#697086',white:'#FFFFFF'},font='Segoe UI';
function text(s,value,x,y,w,h,size=29,color=C.ink,bold=false){
 const box=s.shapes.add({geometry:'textbox',position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 box.text=value;box.text.style={fontSize:size,typeface:font,color,bold,verticalAlignment:'top',autoFit:'none',wrap:'square',insets:0};return box;
}
function slide(title,index){const s=deck.slides.add();s.background.fill=C.bg;text(s,title,70,55,1300,130,52,C.ink,true);text(s,`${index} / 7`,1300,760,85,28,18,C.muted);return s}
async function image(s,file,x,y,w,h,alt,fit='contain'){
 const b=await fs.readFile(path.join(root,file));s.images.add({blob:b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),contentType:'image/png',alt,fit,position:{left:x,top:y,width:w,height:h}});
}
function table(s,values,x,y,width,height,widths,size=25){
 const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width,height,columnWidths:widths,values});
 t.borders.assign({fill:'#DADDE8',width:1,style:'solid'});
 t.cells.block({row:0,column:0,rowCount:values.length,columnCount:values[0].length}).assign({fill:C.bg,textStyle:{fontSize:size,typeface:font,color:C.ink},margins:{left:14,right:14,top:12,bottom:12},anchor:'middle'});
 t.cells.block({row:0,column:0,rowCount:1,columnCount:values[0].length}).assign({fill:'#EDEAFB',textStyle:{fontSize:size,typeface:font,color:C.purple,bold:true}});return t;
}
const notes='Источник: README.md и серверный демонстрационный сценарий ХакКампуса. Имена, проекты и оценки демонстрационные.';
{
 const s=deck.slides.add();s.background.fill=C.ink;
 await image(s,'assets/teamwork.png',820,0,620,810,'Созданная ИИ иллюстрация студенческой команды','cover');
 text(s,'Студенческие хакатоны',70,70,700,50,27,'#B5ABFF');
 text(s,'ХакКампус',70,230,760,120,90,C.white,true);
 text(s,'Командная работа, результаты\nи история проектов в одной среде',70,370,700,150,36,'#E4E4FA');

 s.speakerNotes.text=notes+' Иллюстрация assets/teamwork.png создана ИИ и не изображает реальное мероприятие.';
}
{
 const s=slide('Участие в хакатоне разрывается\nмежду чатом, формой и таблицей',2);
 text(s,'Команда «Орбита» собирается в чате, сдаёт ссылку через форму\nи ждёт результаты из таблицы организатора.',70,215,1290,105,32);
 const cols=[['01','Чат','Участники и роли теряются\nв потоке сообщений.'],['02','Форма','Проект не связан\nс профилями команды.'],['03','Таблица','Оценки и места приходится\nпереносить вручную.']];
 cols.forEach((v,i)=>{const x=70+i*445;text(s,v[0],x,375,350,75,56,C.purple,true);text(s,v[1],x,465,350,55,34,C.ink,true);text(s,v[2],x,535,380,100,28,C.muted)});
 text(s,'ХакКампус связывает команду, заявку и результат в профиле студента.',70,695,1270,50,28,C.purple,true);
 s.speakerNotes.text=notes+' Проблема показана на сценарном примере, без количественных утверждений об аудитории.';
}
{
 const s=slide('Путь команды',3);
 const steps=[['1. Вход студента','Регистрация и выбор события'],['2. Команда','Создание или вступление по коду, своя роль'],['3. Одна заявка','Капитан сдаёт описание и ссылку на проект'],['4. Оценивание','Назначенный судья ставит баллы и комментарий'],['5. Публикация','Организатор фиксирует места и результаты']];
 steps.forEach((v,i)=>{const y=210+i*99;text(s,v[0],70,y,600,43,30,C.ink,true);text(s,v[1],70,y+44,605,48,25,C.muted)});
 await image(s,'docs/captures/submission.png',720,185,650,515,'Форма единой заявки команды Орбита');
 text(s,'Заявка Campus Flow. Демонстрационные данные',720,715,650,38,20,C.muted);
 s.speakerNotes.text=notes+' Изображение: браузерный рендер локального снимка docs/captures/submission.html, сформированного серверным сценарием.';
}
{
 const s=slide('Оценка проекта по прозрачным критериям',4);
 text(s,'Campus Flow',70,210,620,55,34,C.ink,true);text(s,'80 из 100',70,272,620,95,64,C.purple,true);
 table(s,[['Критерий','Вес','Баллы'],['Решение задачи','35%','28'],['Реализация','30%','24'],['Оригинальность','20%','16'],['Демонстрация','15%','12']],70,395,620,300,[370,110,140],25);
 await image(s,'docs/captures/judging.png',740,195,630,430,'Campus Flow в кабинете судьи, оценка 80 из 100');
 text(s,'Судья ставит 80 за каждый критерий.\nОрганизатор закрывает приём и публикует итоги.',740,660,630,85,27);
 s.speakerNotes.text=notes+' Расчёт: 80×0,35 + 80×0,30 + 80×0,20 + 80×0,15 = 28+24+16+12 = 80. Другие демонстрационные проекты получают 90, 70 и 60. Изображение: рендер docs/captures/judging.html.';
}
{
 const s=slide('Второе место и +70 баллов в профиле',5);
 text(s,'2 место',70,210,500,115,84,C.ink,true);text(s,'+70',70,340,500,120,90,C.purple,true);
 text(s,'Анна Смирнова\nРазработчик, капитан «Орбиты»',70,490,560,100,30,C.ink,true);
 text(s,'Проект, роль и история начислений\nсохраняются у каждого участника.',70,615,560,90,28,C.muted);
 await image(s,'docs/captures/profile.png',670,180,710,460,'Профиль Анны Смирновой с проектом Campus Flow и вторым местом');
 text(s,'За места: 100 / 70 / 50. За принятое участие: 10.\nПовторная публикация не начисляет баллы снова.',670,665,710,80,25,C.muted);
 s.speakerNotes.text=notes+' Второй участник «Орбиты», Илья, также получает 70 баллов. Сервер хранит одну запись за каждого студента на хакатон. Изображение: рендер docs/captures/profile.html.';
}
{
 const s=slide('План пилота на двух хакатонах',6);
 text(s,'Первое событие покажет работу процесса.\nВторое позволит измерить возврат студентов.',70,205,1300,105,32);
 table(s,[['Что измеряем','Как считаем','С чем сравниваем'],['Время подведения итогов','Время публикации минус\nвремя закрытия приёма','Прошлый хакатон\nс ручными таблицами'],['Доля сдавших команд','Команды с принятой заявкой /\nзарегистрированные команды','Прошлое событие,\nдинамика по кейсам'],['Возврат студентов','Участники первого на втором /\nвсе участники первого','Два события\nпо ID студентов']],70,355,1300,310,[360,535,405],26);
 text(s,'Это план измерения. Сначала фиксируем базовый уровень.\nИсточники: время публикации, журнал событий и составы команд.',70,695,1280,67,24,C.muted);
 s.speakerNotes.text=notes+' Метрики являются предложением для пилота, не результатами исследования. Панель аналитики в текущий прототип не входит.';
}
{
 const s=slide('Готовность прототипа и следующие шаги',7);
 text(s,'Реализовано',70,210,620,55,34,C.purple,true);
 text(s,'Регистрация студентов и три роли\n\nКоманды и проверка заявок организатором\n\nВзвешенная оценка с комментарием\n\nПортфолио и рейтинг сезона\n\nSQLite и интеграционные проверки',70,290,660,370,28);
 text(s,'Перед вузовским пилотом',790,210,580,55,34,C.purple,true);
 text(s,'Вузовский SSO и восстановление доступа\nРезервные копии и аудит действий',790,290,580,105,28);
 text(s,'Дальнейшее развитие',790,460,580,55,34,C.purple,true);
 text(s,'Поиск участников по навыкам\nОчередь к менторам\nПубличное портфолио по выбору студента',790,535,580,145,28);
 const link=text(s,'github.com/shakirovsport2005-dotcom/shakirov',70,710,1280,40,25,C.purple);
 link.text.get('github.com/shakirovsport2005-dotcom/shakirov').link={uri:'https://github.com/shakirovsport2005-dotcom/shakirov',isExternal:true};
 s.speakerNotes.text=notes+' Приложение запускается локально на Node.js 24+. Публичный сервер приложения не развёрнут. Репозиторий: https://github.com/shakirovsport2005-dotcom/shakirov';
}
for(const [i,s] of deck.slides.items.entries()){
 const png=await deck.export({slide:s,format:'png',scale:1});await fs.writeFile(path.join(build,`slide-${i+1}.png`),new Uint8Array(await png.arrayBuffer()));
}
const candidate=path.join(build,'candidate.pptx');await(await PresentationFile.exportPptx(deck)).save(candidate);
const final=path.join(root,'docs/presentation.pptx');
if(process.env.PRESENTATION_SKILL_DIR){
 const skill=process.env.PRESENTATION_SKILL_DIR;
 const {finalizePresentation}=await import(pathToFileURL(path.join(skill,'container_tools/artifact_tool_utils.mjs')).href);
 const verified=path.join(build,'verified-'+Date.now(),'presentation.pptx');await fs.mkdir(path.dirname(verified),{recursive:true});
 try{
 await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:verified,pythonExecutable:process.env.RUNTIME_PYTHON,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),explicitTotalSlideCount:7,requiredNativeTableOwnerSlides:[4,6],requiredNativeChartOwnerSlides:[],fontPolicy:{basis:'design',families:[font]},layoutArgs:['--expected-slide-size-emu','13716000,7715250','--validate-bullet-geometry','--validate-heading-fit','--require-native-table-slide','4','--require-native-table-slide','6'],verifyArtifactToolImport:true,receiptPath:path.join(build,'validation.json')});
 }catch(error){
  // On Windows the sandbox can allow file copies while disallowing hard links.
  // This exact failure occurs only after the finalizer has passed every check.
  if(process.platform!=='win32'||error.code!=='EPERM'||error.syscall!=='link'||error.dest!==verified||!String(error.path).endsWith('.validated'))throw error;
  const before=await fs.readFile(candidate);
  await fs.copyFile(candidate,verified,1);
  const sha=b=>createHash('sha256').update(b).digest('hex');
  if(sha(before)!==sha(await fs.readFile(verified)))throw new Error('Final presentation byte mismatch');
  await fs.writeFile(path.join(build,'validation.json'),JSON.stringify({checksCompletedBeforePublish:true,publishMethod:'exclusive-copy',sha256:sha(before),byteCount:before.length},null,2));
 }
 await fs.copyFile(verified,final);
}else await fs.copyFile(candidate,final);
console.log('Created docs/presentation.pptx: 7 editable slides.');
