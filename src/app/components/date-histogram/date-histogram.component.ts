import { Component, OnChanges, output, input } from '@angular/core'
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';

/**
 * ! The ion-datetime-buttons have been commented out in the template 
 * ! because the component is not compatible with Angular SSR - it
 * ! throws a runtime error on the server side.
 */
@Component({
  selector: 'date-histogram',
  templateUrl: './date-histogram.component.html',
  styleUrls: ['./date-histogram.component.scss'],
  imports: [NgClass, FormsModule, IonicModule]
})
export class DateHistogramComponent implements OnChanges {
  readonly selectedRange = input<any>();
  readonly years = input<[any]>();
  readonly yearsAll = input<[any]>();
  readonly rangeChange = output<any>();

  currentRange: any = undefined;
  firstUpdate: boolean = true;
  firstYear?: string = undefined;
  from?: string = undefined;
  lastYear?: string = undefined;
  max: number = 0;
  to?: string = undefined;

  ngOnChanges() {
    this.updateMax();
    this.updateData();
  }

  private updateMax() {
    this.max = this.years()?.reduce(function (current, year) {
      return Math.max(current, year.doc_count)
    }, 0) || 0;
  }

  private updateData() {
    const years = this.years();
    const yearsAll = this.yearsAll();
    const selectedRange = this.selectedRange();
    this.currentRange = selectedRange !== undefined ? {...selectedRange} : undefined;

    if (yearsAll && years) {
      if (this.firstUpdate) {
        this.firstUpdate = false;

        if (yearsAll.length) {
          this.firstYear = yearsAll[0]['key_as_string'];
          this.lastYear = yearsAll[yearsAll.length - 1]['key_as_string'];

          let first = Number(yearsAll[0]['key_as_string']);
          while (first % 10 !== 0) {
            first = first - 1;
            yearsAll.unshift(
              {
                key: new Date(String(first)).getTime(),
                key_as_string: String(first),
                doc_count: 0
              }
            );
          }

          let last = Number(yearsAll[yearsAll.length - 1]['key_as_string']);
          while (last % 10 !== 0) {
            last = last + 1;
            yearsAll.push(
              {
                key: new Date(String(last)).getTime(),
                key_as_string: String(last),
                doc_count: 0
              }
            );
          }
        }
        // console.log('yearsAll', this.yearsAll);
      } else if (this.currentRange?.from && this.currentRange?.to) {
        // console.log(this.currentRange);
        this.from = this.currentRange?.from;
        this.to = this.currentRange?.to;
      } else if (!this.currentRange) {
        this.from = undefined;
        this.to = undefined;
      }

      // console.log('years', this.years);

      for (let a = 0; a < yearsAll.length; a++) {
        yearsAll[a]['doc_count_current'] = 0;
        for (let y = 0; y < years.length; y++) {
          if (yearsAll[a]['key_as_string'] === years[y]['key_as_string']) {
            yearsAll[a]['doc_count_current'] = years[y]['doc_count'];
            break;
          }
        }
      }
    }
  }

  reset() {
    this.from = undefined;
    this.to = undefined;
    this.rangeChange.emit(null);
  }

  // Send the change event to the parent component
  onChange() {
    const fromTime = new Date(this.from || '').getTime();
    // Add one year to get the full year.
    const toTime = new Date(`${parseInt(this.to || '') + 1}`).getTime();

    if (fromTime <= toTime) {
      this.rangeChange.emit({ from: this.from, to: this.to });
    }
  }

  getYearRelativeToMax(year: any) {
    return `${Math.floor(year.doc_count_current / this.max * 100)}%`;
  }

  isDecade(year: any) {
    return parseInt(year.key_as_string || '') % 10 === 0;
  }

  selectYear(selected: any) {
    this.currentRange = undefined;
    if (!this.from) {
      this.from = selected.key_as_string;
    } else if (!this.to && parseInt(selected.key_as_string || '') >= parseInt(this.from)) {
      this.to = selected.key_as_string;
    } else {
      this.from = selected.key_as_string;
      this.to = undefined;
    }

    if (this.from && this.to) {
      this.onChange();
    }
  }

  isYearInRange(year: any) {
    const yearNumber = parseInt(year.key_as_string || '');
    if (year.key_as_string === this.from || year.key_as_string === this.to) {
      return true;
    } else if (this.from && this.to) {
      return yearNumber >= parseInt(this.from) && yearNumber <= parseInt(this.to);
    } else {
      return false;
    }
  }

  updateYearFrom(event: any) {
    if (event?.detail?.value) {
      this.currentRange = undefined;
      if (!this.to || this.to && parseInt(event?.detail?.value) > parseInt(this.to || '')) {
        this.from = event?.detail?.value;
        this.to = undefined;
      } else {
        this.from = event?.detail?.value;
        this.onChange();
      }
    }
  }

  updateYearTo(event: any) {
    if (event?.detail?.value) {
      this.currentRange = undefined;
      if (!this.from || this.from && parseInt(event?.detail?.value) < parseInt(this.from || '')) {
        this.to = event?.detail?.value;
        this.from = undefined;
      } else {
        this.to = event?.detail?.value;
        this.onChange();
      }
    }
  }

}
