import {
  Component,
  ElementRef,
  EventEmitter,
  forwardRef,
  Input,
  OnInit,
  Output,
  ViewChild,
} from '@angular/core';
import {
  ControlValueAccessor,
  FormControl,
  NG_VALUE_ACCESSOR,
  ReactiveFormsModule,
} from '@angular/forms';
import { QuillModule, QuillModules } from 'ngx-quill';
import { ContentChange } from 'ngx-quill/lib/quill-editor.component';

@Component({
  selector: 'app-rich-text-editor',
  standalone: true,
  imports: [ReactiveFormsModule, QuillModule],
  templateUrl: './rich-text-editor.component.html',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditorComponent),
      multi: true,
    },
  ],
})
export class RichTextEditorComponent implements OnInit, ControlValueAccessor {
  @Output() blur = new EventEmitter();
  @Output() focus = new EventEmitter();

  @Input() editorControl: FormControl;

  quillConfig: QuillModules = {
    toolbar: [
      [{ header: [1, 2, 3, 4, 5, 6, false] }],
      ['bold', 'italic', 'underline'],
      [{ color: [] }],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['link', 'image'],
      ['blockquote', 'code-block'],
      [{ indent: '-1' }, { indent: '+1' }],
      [{ align: [] }],
    ],
    keyboard: {
      bindings: {
        enter: {
          key: 13,
          shiftKey: false,
          handler: function (range: any, context: any) {
            // Xử lý nếu muốn enter khi submit form
            return true;
          },
        },
      },
    },
  };

  content!: string;
  private onTouched!: Function;
  private onChanged!: Function;

  constructor() {
    this.editorControl = new FormControl();
  }

  ngOnInit(): void {}

  writeValue(content: string): void {
    this.editorControl.patchValue(content);
  }

  registerOnChange(fn: any): void {
    this.onChanged = fn;
  }

  registerOnTouched(fn: any): void {
    this.onTouched = fn;
  }

  onContentChange(content: ContentChange): void {
    if (content && content.html) {
      this.onChanged(content.html);
    } else {
      this.onChanged('');
    }
  }

  onFocus(): void {
    if (this.onTouched) {
      this.onTouched();
    }
    this.focus.emit();
  }

  onBlur(): void {
    // Xử lý sự kiện blur để giúp form kiểm tra validation
    if (this.onTouched) {
      this.onTouched();
    }
    this.blur.emit();
  }

  editorCreated(editor: any): void {
    if (editor) {
      editor.focus();

      // Thêm sự kiện keydown để xử lý Esc
      editor.keyboard.addBinding({ key: 27 }, () => {
        this.blur.emit();
        return true;
      });
    }
  }
}
