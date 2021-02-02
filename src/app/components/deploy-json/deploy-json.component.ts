import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { HEADERS, CsvUtterance } from 'src/app/models/CsvUtterance';
import { ConvertService } from 'src/app/services/convert.service';
import { LuisAppService } from 'src/app/services/luis-app.service';
import { PersistentService } from 'src/app/services/persistent.service';
import { ClrLoadingState } from '@clr/angular';

@Component({
  selector: 'app-deploy-json',
  templateUrl: './deploy-json.component.html',
  styleUrls: ['./deploy-json.component.scss']
})
export class DeployJsonComponent implements OnInit {
  
  trained = false;
  intents: string[] = [];
  intentsSelectionTestdata: boolean[] = [];
  intentsSelectionTraindata: boolean[] = [];
  /** */
  result: CsvUtterance[] = [];
  selectedTestdata: CsvUtterance[] = [];
  selectedTrainingsdata: CsvUtterance[] = [];
  openModalUpdateSettings = false;
  groundTruth: string = "";
  json : string =""; 
  layout = {
    direction : "vertical", 
    block1 : "clr-col-lg-3 clr-col-12 ",
    block2 : "clr-col-lg-9 clr-col-12 ",
  }

  uploadedFile = {
    exist : false,
    json : false, 
    csv : false,
    content : '',
    name : ''
  }

  data =  {
    type:'train',
    uploadedFile:false
  };

  timelineStyle = {
    step0: { state: "current", open: true ,failed: false},
    step1: { state: "not-started", open: false , failed: false},
    step2: { state: "not-started", open: false,failed: false },
    step3: { state: "not-started", open: false,failed: false },
    step4: { state: "not-started", open: false,failed: false },
  };
 
  luis = {
    app:
    {
      name: '',
      description: '',
      culture:'de-de',
      id: '',
      url : '',
      version: '1.0',
      created: 1,
      region:'',
      publishedDateTime: '',
      trained: 1,
      tested: 1,
      published: 1,
      settings:{sentimentAnalysis:false,speech:false,spellChecker:false},
      isStaging: false,
    }
  };
  
  constructor( private luisService: LuisAppService,private persistentService: PersistentService,private convertService: ConvertService) 
  { }

  ngOnInit(): void {
    this.persistentService.getGT().subscribe(data => { this.groundTruth = data; 
    this.createUtterances(this.groundTruth, this.result); 
    this.intents = this.getIntents(0);
    this.intents = this.getIntents(1); 
  });

  }
  changeToHorizonTal()
  {
    this.layout = {
      direction : "horizontal", 
      block1 : "clr-col-lg-12 clr-col-12 height container",
      block2 : "clr-col-lg-12 clr-col-12 container",
    }
  }
  changeToVertical()
  {
    this.layout = {
      direction : "vertical", 
      block1 : "clr-col-lg-3 clr-col-12 ",
      block2 : "clr-col-lg-9 clr-col-12 ",
    }
  }
  createUtterances(file: string, result: CsvUtterance[]): void {

    let dataArray: string[] = file.split(/\r\n|\n/);
    let headers = dataArray[0].split(";");

    let i = 1;
    for (i = 1; i < dataArray.length; i++) {
      let currentLine = dataArray[i].split(";");
      if (currentLine.length == headers.length) {
        let csvUtterance: CsvUtterance = new CsvUtterance();
        csvUtterance.id = currentLine[0];
        csvUtterance.transcript = currentLine[1];
        csvUtterance.category = currentLine[2];
        csvUtterance.literal = currentLine[3];
        csvUtterance.startIndex = currentLine[4];
        csvUtterance.endIndex = currentLine[5];
        csvUtterance.intent = currentLine[6];
        csvUtterance.tag = currentLine[7];
        result.push(csvUtterance);
      } else {
        console.log('Error occured while reading file on line ' + i + '.');
      }

    }

  }
  refreshUtterances(utterances: CsvUtterance[]) {
    let entriesArray = [];
    for (let i = 0; i < utterances.length; i++) {
      let entries = [];
      entries[0] = "" + (i + 1);

      entries[1] = utterances[i].transcript;
      entries[2] = utterances[i].category;
      entries[3] = utterances[i].literal;
      entries[4] = utterances[i].startIndex;
      entries[5] = utterances[i].endIndex;
      entries[6] = utterances[i].intent;
      entries[7] = utterances[i].tag;
      entriesArray.push(entries.join(";").replace(/-/gi, ""));
    }
    entriesArray.unshift(HEADERS.join(";"));

    return entriesArray;
  }
  selectIntents(intent: string, trainOrTest:number) { // train = 0 , test = else
    if(trainOrTest == 0)
    {
      this.result.forEach(element => { if (element.intent == intent) { this.selectedTrainingsdata.push(element) } });
    }
    else
    {
      this.result.forEach(element => { if (element.intent == intent) { this.selectedTestdata.push(element) } });
    }
  }
  deselectIntents(intent: string, trainOrTest:number) {
    if(trainOrTest == 0)
    {
      this.selectedTrainingsdata = this.selectedTrainingsdata.filter(element => element.intent != intent);
    }
    else
    {
      this.selectedTestdata = this.selectedTestdata.filter(element => element.intent != intent);
    }
  }
  deselectAllIntentButtons()
  {
    this.intentsSelectionTestdata.forEach(data => data=false);
  }
  /**
   *  To generate Intents Buttons 
   *  0 for Train data buttons
   * 1 for Test data buttons
   * @param trainOrTest 
   */
  getIntents(trainOrTest:number): string[] 
  {
    if(trainOrTest == 0)
    {
      let temp = this.result.map(element => element.intent);
      temp = [...new Set(temp)];
      temp.forEach(element => this.intentsSelectionTestdata.push(false));
      return temp;
    }
    else
    {
      let temp = this.result.map(element => element.intent);
      temp = [...new Set(temp)];
      temp.forEach(element => this.intentsSelectionTraindata.push(false));
      return temp;
    }
    
  }
  deleteApp()
  {
    this.luisService.deleteApp(this.deleteApp.name , true)
    this.reset();
  }
  createAppState()
  {
    this.luis.app.created == 0? this.timelineStyle.step1.state = 'success' :  this.timelineStyle.step1.failed? this.timelineStyle.step1.state = 'error' :  this.timelineStyle.step1.state = 'not-started'
    return this.timelineStyle.step1.state;
  }
  createApp() 
  { 
      if(this.selectedTrainingsdata.length!= 0) // SELECT TRAIN DATA
      {     
        let csv = this.refreshUtterances(this.selectedTrainingsdata).join("\n");
        this.convertService.convertCsvToJson(csv, this.luis.app.name)
        .toPromise().then(data => { 
          this.json = JSON.stringify(data, null, 5);
          this.json = this.editNameAndDescription(this.json);
          this.luisService.createApp(this.json).subscribe(
            data => { 
            let createdApp = JSON.parse(data.body);
            this.luis.app.id = createdApp.appID;
            this.luis.app.version = createdApp.version;
            this.luis.app.name = createdApp.name;
            this.luis.app.created = 0;

              //TODO : Notification Message  
          },
          err => {
            this.timelineStyle.step1.failed = true;
            this.timelineStyle.step1.state = "error";
            console.log("err")
            console.log(err)
          
            //TODO : Error Message
          });
          });
      }
      if(this.selectedTestdata.length!= 0) // SELECT Test DATA
      {
        let csv = this.refreshUtterances(this.selectedTestdata).join("\n");
        this.persistentService.testData(csv, this.luis.app.name )
        .toPromise().then(data => { 
          this.json = JSON.stringify(data, null, 5); 
        });
      }
      else if(this.selectedTestdata.length == 0) // SKIP
      {
        let csv = this.refreshUtterances(this.selectedTrainingsdata).join("\n");
        this.persistentService.autoData(csv, this.luis.app.name,this.luis.app.version,this.luis.app.description,this.luis.app.culture)
        .toPromise().then(data => {
            this.json = JSON.stringify(data, null, 5); 
          
          });
      }
    
      this.timelineStyle.step1.state = this.createAppState();
  }
  train() {
    this.trained = true;
    this.timelineStyle.step2.state = "processing";
    this.luisService.trainApp(this.luis.app.name).subscribe(
    data => { 
     this.luis.app.trained = 0;
      // NOTIFICATION 

      this.trained = false;
      this.timelineStyle.step2.state = "success";
      this.timelineStyle.step3.state = "current";
    },
    err => {
      this.timelineStyle.step2.failed = true;
      // NOTIFICATION
    }

    );
    
  }
  publish() {
    this.luisService.publish(this.luis.app.name, this.luis.app.isStaging).subscribe(
      data => {
        this.luis.app.published = 0;
        // NOTIFICATION
      //  let app = JSON.parse(data.body)
       // console.log(app.body)
        console.log(data)
        let info = JSON.stringify(data);
        let app = JSON.parse(info)
        this.luis.app.url = app.endpointUrl; 
        this.luis.app.region = app.region; 
       },
       err => {
        this.timelineStyle.step3.failed = true;
         // NOTIFICATION
       }
    );
    this.luisService.getAppInfo(this.luis.app.name).subscribe(
      data => {
        let app = JSON.parse(data.body); 
        console.log(app)
       
     
        this.luis.app.isStaging = app.isStaging; 
        this.luis.app.publishedDateTime = app.lastModifiedDateTime;
        console.log(this.luis.app)
        console.log(data)

       },
       err => {
         // NOTIFICATION
       }
    );
    this.luisService.getPublishSettings(this.luis.app.name)
    .subscribe(
      data => {
        let settings = JSON.parse(data.body);
        this.luis.app.settings.sentimentAnalysis = settings.sentimentAnalysis;
        this.luis.app.settings.speech = settings.speech;
        this.luis.app.settings.spellChecker = settings.spellChecker;
        console.log(data.body)
        // NOTIFICATION
        
       },
       err => {
         // NOTIFICATION
       }
    );
 
  }
  test()
  {
    this.intents.forEach(data => {
      this.luisService.batchTestApp(this.luis.app.name, data);
      this.timelineStyle.step4.state = 'success';
      this.luis.app.tested = 0;
    },
    err => 
    {
      console.log(err)
    }
    )
  }

/**
 * 
 * @param jsonString 
 * @returns the same json but with another name and description
 */
  editNameAndDescription(jsonString) 
  {
    let jsonObject = JSON.parse(jsonString); 
    jsonObject.name = this.luis.app.name; 
    jsonObject.desc = this.luis.app.description; 
    jsonString = JSON.stringify(jsonObject, null, 5);
    return jsonString;
  }
  readCsvFile(event: any) 
  {

    let fileList: FileList = event.target.files;
    let file = fileList.item(0);
      // Initialize Object properties
      this.uploadedFile = {
        exist : false,
        json : false, 
        csv : false,
        content : '',
        name : fileList.item(0).name
      }

      let fileReader = new FileReader();
      fileReader.readAsText(file);
      if ((file.name.endsWith(".csv"))) // Reading csv file
      {
        this.uploadedFile.csv = true;
        this.uploadedFile.exist = true;

        fileReader.onload = () => {
          let data = fileReader.result;
          this.uploadedFile.content = (<string>data);
         
          // convert in json
          this.convertService.convertCsvToJson(this.uploadedFile.content, this.luis.app.name)
               .toPromise().then(data => { this.uploadedFile.content = JSON.stringify(data, null, 3); });
        }
        fileReader.onerror = () => {
          console.log('Error occured while reading file!');
           //TODO : NOTIFICATION
        };
      }
      else if ((file.name.endsWith(".json"))) // Reading csv file
      {
        this.uploadedFile.json = true;
        this.uploadedFile.exist = true;

        fileReader.onload = () => {
          let data = fileReader.result;
          this.uploadedFile.content = (<string>data);
          this.uploadedFile.content = JSON.parse(this.uploadedFile.content);
          this.uploadedFile.content = JSON.stringify(this.uploadedFile.content, null, 3); 
        }
        fileReader.onerror = () => {
          console.log('Error occured while reading file!');
          //TODO : NOTIFICATION
        };
      }

  
  }
  reset()
  {
    this.json = "";
    this.luis = {
      app:
      {
        name: '',
        description: '',
        culture:'de-de',
        id: '',
        url : '',
        version: '1.0',
        created: 1,
        region:'',
        publishedDateTime: '',
        trained: 1,
        tested: 1,
        published: 1,
        settings:{sentimentAnalysis:false,speech:false,spellChecker:false},
        isStaging: false,
      }
    };
    this.trained = false;
    this.intents = [];
    this.intentsSelectionTestdata = [];
    this.intentsSelectionTraindata = [];
    this.intents = this.getIntents(0);
    this.intents = this.getIntents(1);
    this.timelineStyle = {
      step0: { state: "current", open: true ,failed: false},
      step1: { state: "not-started", open: false , failed: false},
      step2: { state: "not-started", open: false,failed: false },
      step3: { state: "not-started", open: false,failed: false },
      step4: { state: "not-started", open: false,failed: false },
    };
  }
  
}
